import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '../users/entities/user.entity';
import {
  NotificationsService,
  NotificationType,
} from '../notifications/notifications.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { Warehouse } from './entities/warehouse.entity';
import {
  WarehouseScopeService,
  type WarehouseScope,
} from './warehouse-scope.service';
import { WarehousesRepository } from './warehouses.repository';

@Injectable()
export class WarehousesService {
  constructor(
    private readonly warehousesRepository: WarehousesRepository,
    private readonly notifications: NotificationsService,
  ) {}

  private async notifyResponsible(warehouse: Warehouse): Promise<void> {
    if (!warehouse.responsibleUserId) return;
    await this.notifications.notifyUser(warehouse.responsibleUserId, {
      type: NotificationType.Assignment,
      title: 'Depo sorumluluğu',
      message: `"${warehouse.name}" deposuna sorumlu olarak atandınız.`,
      link: `/warehouses/${warehouse.id}`,
      entityType: 'warehouse',
      entityId: warehouse.id,
    });
  }

  async create(dto: CreateWarehouseDto): Promise<Warehouse> {
    await this.assertCodeAvailable(dto.code);
    const warehouse = this.warehousesRepository.create(dto);
    const saved = await this.warehousesRepository.save(warehouse);
    await this.notifyResponsible(saved);
    return saved;
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Warehouse;
    order: 'ASC' | 'DESC';
    q?: string;
    scope?: WarehouseScope;
  }): Promise<[Warehouse[], number]> {
    const { scope, ...rest } = options;
    const ids = scope === undefined || scope === 'ALL' ? undefined : scope;
    if (ids && ids.length === 0) {
      return Promise.resolve([[], 0]);
    }
    return this.warehousesRepository.findAndCount({ ...rest, ids });
  }

  // `scope` is only passed from the controller; internal callers (zones,
  // stock-items, transactions) validate existence without a scope check.
  async findOne(id: string, scope?: WarehouseScope): Promise<Warehouse> {
    const warehouse = await this.warehousesRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }
    if (scope !== undefined) {
      WarehouseScopeService.assertInScope(scope, warehouse.id);
    }
    return warehouse;
  }

  async update(id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    const warehouse = await this.findOne(id);
    const prevResponsible = warehouse.responsibleUserId;

    if (dto.code && dto.code !== warehouse.code) {
      await this.assertCodeAvailable(dto.code);
      warehouse.code = dto.code;
    }

    const { code: _code, ...rest } = dto;
    Object.assign(warehouse, rest);
    // Keep the eager relation in sync, or it would re-write a cleared FK.
    if (dto.responsibleUserId !== undefined) {
      warehouse.responsibleUser = dto.responsibleUserId
        ? ({ id: dto.responsibleUserId } as User)
        : null;
    }

    const saved = await this.warehousesRepository.save(warehouse);
    if (
      dto.responsibleUserId !== undefined &&
      dto.responsibleUserId &&
      dto.responsibleUserId !== prevResponsible
    ) {
      await this.notifyResponsible(saved);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    // Load zones so the soft-remove cascades to them (and each fires the
    // audit subscriber).
    const warehouse = await this.warehousesRepository.findByIdWithZones(id);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }
    await this.warehousesRepository.softRemove(warehouse);
  }

  private async assertCodeAvailable(code: string): Promise<void> {
    const existing = await this.warehousesRepository.findByCode(code);
    if (existing) {
      throw new ConflictException(
        `Warehouse with code "${code}" already exists`,
      );
    }
  }
}
