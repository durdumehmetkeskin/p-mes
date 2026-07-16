import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Customer } from '../customers/entities/customer.entity';
import type { Project } from '../project/entities/project.entity';
import { CreateLotDto } from './dto/create-lot.dto';
import { UpdateLotDto } from './dto/update-lot.dto';
import { Lot } from './entities/lot.entity';
import { StockItem } from './entities/stock-item.entity';
import { LotStatus } from './enums/lot-status.enum';
import { computeLotExpiryStatus } from './lot-expiry.util';
import { RacksService } from './racks.service';
import { LotsRepository } from './lots.repository';
import { MaterialsService } from './materials.service';
import {
  resolveWarehouseIds,
  WarehouseScope,
  WarehouseScopeService,
} from './warehouse-scope.service';

@Injectable()
export class LotsService {
  constructor(
    private readonly lotsRepository: LotsRepository,
    private readonly materialsService: MaterialsService,
    private readonly racksService: RacksService,
    @InjectRepository(StockItem)
    private readonly stockItems: Repository<StockItem>,
  ) {}

  async create(dto: CreateLotDto): Promise<Lot> {
    const material = await this.materialsService.findOne(dto.materialId); // 404

    // lotNumber is server-generated (never client-set) — drop any sent value.
    const {
      materialId: _m,
      rackId,
      customerId,
      projectId,
      lotNumber: _ln,
      ...rest
    } = dto;
    const lot = this.lotsRepository.create(rest);
    // Set via relation objects (eager-relation gotcha).
    lot.material = material;
    lot.rack = rackId ? await this.racksService.findOne(rackId) : null;
    lot.customer = customerId ? ({ id: customerId } as Customer) : null;
    lot.project = projectId ? ({ id: projectId } as Project) : null;
    // Status is derived from expiry vs the material's thresholds, never client-set.
    lot.status = computeLotExpiryStatus(
      lot.expiryDate ?? null,
      material.dangerWeeks,
      material.warningWeeks,
    );

    // Auto-generate the template lot number, retrying on the rare concurrent
    // sequence collision (the next attempt re-reads the max and increments).
    for (let attempt = 0; ; attempt++) {
      lot.lotNumber = await this.generateLotNumber();
      try {
        const saved = await this.lotsRepository.save(lot);
        return this.findOne(saved.id);
      } catch (e) {
        if (attempt < 5 && this.isUniqueViolation(e)) continue;
        throw e;
      }
    }
  }

  /** Next `LOT-YYYYMMDD-NNNN` (4-digit daily global sequence). */
  private async generateLotNumber(): Promise<string> {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    const prefix = `LOT-${ymd}-`;
    const max = await this.lotsRepository.maxSequenceForPrefix(prefix);
    return `${prefix}${String(max + 1).padStart(4, '0')}`;
  }

  private isUniqueViolation(e: unknown): boolean {
    const err = e as { code?: string; driverError?: { code?: string } };
    return err?.code === '23505' || err?.driverError?.code === '23505';
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Lot;
    order: 'ASC' | 'DESC';
    q?: string;
    materialId?: string;
    projectId?: string;
    status?: LotStatus;
    scope?: WarehouseScope;
  }): Promise<[Lot[], number]> {
    const warehouseIds = resolveWarehouseIds(options.scope ?? 'ALL');
    return this.lotsRepository.findAndCount({ ...options, warehouseIds });
  }

  async findOne(id: string, scope: WarehouseScope = 'ALL'): Promise<Lot> {
    const lot = await this.lotsRepository.findById(id);
    if (!lot) {
      throw new NotFoundException(`Lot ${id} not found`);
    }
    WarehouseScopeService.assertInScope(scope, lot.rack?.zone?.warehouseId);
    return lot;
  }

  async update(id: string, dto: UpdateLotDto): Promise<Lot> {
    const lot = await this.findOne(id);

    const targetMaterialId = dto.materialId ?? lot.materialId;
    const targetLotNumber = dto.lotNumber ?? lot.lotNumber;

    // Re-check uniqueness if the (material, lotNumber) pair is changing.
    if (
      targetMaterialId !== lot.materialId ||
      targetLotNumber !== lot.lotNumber
    ) {
      await this.assertLotNumberAvailable(
        targetMaterialId,
        targetLotNumber,
        id,
      );
    }

    if (dto.materialId && dto.materialId !== lot.materialId) {
      lot.material = await this.materialsService.findOne(dto.materialId);
    }
    if (dto.rackId !== undefined) {
      lot.rack = dto.rackId
        ? await this.racksService.findOne(dto.rackId)
        : null;
    }
    // Keep the eager relations in sync, or they would re-write a cleared FK.
    if (dto.customerId !== undefined) {
      lot.customer = dto.customerId
        ? ({ id: dto.customerId } as Customer)
        : null;
    }
    if (dto.projectId !== undefined) {
      lot.project = dto.projectId ? ({ id: dto.projectId } as Project) : null;
    }

    const {
      materialId: _m,
      rackId: _l,
      customerId: _c,
      projectId: _p,
      ...rest
    } = dto;
    Object.assign(lot, rest);

    // Recompute derived status against the effective expiry + material.
    lot.status = computeLotExpiryStatus(
      lot.expiryDate ?? null,
      lot.material?.dangerWeeks ?? null,
      lot.material?.warningWeeks ?? null,
    );

    await this.lotsRepository.save(lot);
    return this.findOne(id);
  }

  /** Delete a lot (leaf-first): blocked while it still has stock items. */
  async remove(id: string, scope: WarehouseScope = 'ALL'): Promise<void> {
    const lot = await this.findOne(id, scope);
    const stockCount = await this.stockItems.count({ where: { lotId: id } });
    if (stockCount > 0) {
      throw new ConflictException(
        'Bu lot silinemez: bağlı stok kayıtları var. Önce stok kayıtlarını silin.',
      );
    }
    await this.lotsRepository.softRemove(lot);
  }

  private async assertLotNumberAvailable(
    materialId: string,
    lotNumber: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.lotsRepository.findByMaterialAndLotNumber(
      materialId,
      lotNumber,
    );
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Lot number "${lotNumber}" already exists for this material`,
      );
    }
  }
}
