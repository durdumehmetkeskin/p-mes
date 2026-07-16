import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QrService } from '../qr/qr.service';
import { QrResult } from '../qr/qr.types';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { Lot } from './entities/lot.entity';
import { Material } from './entities/material.entity';
import { LotExpiryScannerService } from './lot-expiry-scanner.service';
import { MaterialTypesService } from './material-types.service';
import { MaterialUnitsService } from './material-units.service';
import { MaterialsRepository } from './materials.repository';

@Injectable()
export class MaterialsService {
  constructor(
    private readonly materialsRepository: MaterialsRepository,
    private readonly materialTypesService: MaterialTypesService,
    private readonly materialUnitsService: MaterialUnitsService,
    private readonly qrService: QrService,
    private readonly lotExpiryScanner: LotExpiryScannerService,
    @InjectRepository(Lot)
    private readonly lots: Repository<Lot>,
  ) {}

  /** Next `MAT-YYYY-NNNN` (4-digit yearly sequence; deleted codes not reused). */
  private async generateMaterialCode(): Promise<string> {
    const prefix = `MAT-${new Date().getFullYear()}-`;
    const codes = await this.materialsRepository.findCodesByPrefix(prefix);
    const max = codes.reduce(
      (m, c) => Math.max(m, Number.parseInt(c.slice(prefix.length), 10) || 0),
      0,
    );
    return `${prefix}${String(max + 1).padStart(4, '0')}`;
  }

  private isUniqueViolation(e: unknown): boolean {
    const err = e as { code?: string; driverError?: { code?: string } };
    return err?.code === '23505' || err?.driverError?.code === '23505';
  }

  async create(dto: CreateMaterialDto): Promise<Material> {
    // code is server-generated (never client-set); customer/project links were
    // removed from materials (they live on lots) — drop all of them.
    const {
      code: _code,
      customerId: _cust,
      projectId: _proj,
      materialTypeId,
      materialUnitId,
      ...rest
    } = dto;
    const material = this.materialsRepository.create(rest);
    // Set via the relation object (not just the FK column) so TypeORM persists
    // it — when both are present on an entity, the relation object wins.
    if (materialTypeId) {
      material.materialType =
        await this.materialTypesService.findOne(materialTypeId);
    }
    material.materialUnit =
      await this.materialUnitsService.findOne(materialUnitId);

    // Auto-generate the code, retrying on the rare concurrent sequence
    // collision (the next attempt re-reads the max and increments).
    for (let attempt = 0; ; attempt++) {
      material.code = await this.generateMaterialCode();
      try {
        const saved = await this.materialsRepository.save(material);
        // Reload so the eager relations are populated in the response.
        return this.findOne(saved.id);
      } catch (e) {
        if (attempt < 5 && this.isUniqueViolation(e)) continue;
        throw e;
      }
    }
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Material;
    order: 'ASC' | 'DESC';
    q?: string;
  }): Promise<[Material[], number]> {
    return this.materialsRepository.findAndCount(options);
  }

  async findOne(id: string): Promise<Material> {
    const material = await this.materialsRepository.findById(id);
    if (!material) {
      throw new NotFoundException(`Material ${id} not found`);
    }
    return material;
  }

  /** Generate a QR code (PNG) for a material, encoding its id/SKU and deep link. */
  async generateQr(id: string): Promise<QrResult> {
    const material = await this.findOne(id);
    const payload = this.qrService.buildPayload(
      'material',
      material.id,
      material.code,
      `/materials/${material.id}`,
    );
    const buffer = await this.qrService.toPng(payload);
    return {
      fileName: this.qrService.fileName('material', material.code),
      buffer,
    };
  }

  async update(id: string, dto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findOne(id);

    // code is server-generated and immutable; customer/project links no longer
    // exist on materials — all dropped below.
    // Apply scalar fields; handle the relations via their objects below.
    const {
      code: _code,
      customerId: _cust,
      projectId: _proj,
      materialTypeId,
      materialUnitId,
      ...rest
    } = dto;
    Object.assign(material, rest);

    if (materialTypeId !== undefined) {
      material.materialType = materialTypeId
        ? await this.materialTypesService.findOne(materialTypeId)
        : null;
    }

    if (materialUnitId !== undefined) {
      material.materialUnit = materialUnitId
        ? await this.materialUnitsService.findOne(materialUnitId)
        : null;
    }

    await this.materialsRepository.save(material);

    // Changing the expiry thresholds re-buckets all of this material's lots.
    if (dto.dangerWeeks !== undefined || dto.warningWeeks !== undefined) {
      await this.lotExpiryScanner.recomputeForMaterial(id);
    }

    return this.findOne(id); // reload eager materialType
  }

  /** Delete a material (leaf-first): blocked while it still has lots. */
  async remove(id: string): Promise<void> {
    const material = await this.findOne(id);
    const lotCount = await this.lots.count({ where: { materialId: id } });
    if (lotCount > 0) {
      throw new ConflictException(
        'Bu malzeme silinemez: bağlı lotlar var. Önce lotları silin.',
      );
    }
    await this.materialsRepository.softRemove(material);
  }

}
