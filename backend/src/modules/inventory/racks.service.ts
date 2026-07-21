import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../project/entities/order.entity';
import { CreateRackDto } from './dto/create-rack.dto';
import { UpdateRackDto } from './dto/update-rack.dto';
import { Rack } from './entities/rack.entity';
import { Zone } from './entities/zone.entity';
import { RacksRepository } from './racks.repository';
import {
  WarehouseScopeService,
  type WarehouseScope,
} from './warehouse-scope.service';
import { ZonesService } from './zones.service';

@Injectable()
export class RacksService {
  constructor(
    private readonly racksRepository: RacksRepository,
    private readonly zonesService: ZonesService,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
  ) {}

  async create(dto: CreateRackDto): Promise<Rack> {
    const zone = await this.zonesService.findOne(dto.zoneId);
    await this.assertCodeAvailable(dto.zoneId, dto.code);
    if (dto.orderId) await this.assertOrderForZone(dto.orderId, zone);

    const { zoneId: _zoneId, ...rest } = dto;
    const rack = this.racksRepository.create(rest);
    rack.zone = zone;

    const saved = await this.racksRepository.save(rack);
    return this.findOne(saved.id);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Rack;
    order: 'ASC' | 'DESC';
    q?: string;
    zoneId?: string;
    orderId?: string;
    scope?: WarehouseScope;
  }): Promise<[Rack[], number]> {
    const { scope, ...rest } = options;
    if (Array.isArray(scope) && scope.length === 0) {
      return Promise.resolve([[], 0]);
    }
    return this.racksRepository.findAndCount({
      ...rest,
      warehouseIds: scope === 'ALL' || scope === undefined ? undefined : scope,
    });
  }

  async findOne(id: string, scope?: WarehouseScope): Promise<Rack> {
    const rack = await this.racksRepository.findById(id);
    if (!rack) {
      throw new NotFoundException(`Rack ${id} not found`);
    }
    if (scope !== undefined) {
      WarehouseScopeService.assertInScope(scope, rack.zone?.warehouseId);
    }
    return rack;
  }

  async update(id: string, dto: UpdateRackDto): Promise<Rack> {
    const rack = await this.findOne(id);

    const targetZoneId = dto.zoneId ?? rack.zoneId;
    const targetCode = dto.code ?? rack.code;

    if (targetZoneId !== rack.zoneId || targetCode !== rack.code) {
      await this.assertCodeAvailable(targetZoneId, targetCode, id);
    }

    if (dto.zoneId && dto.zoneId !== rack.zoneId) {
      rack.zone = await this.zonesService.findOne(dto.zoneId);
    }

    // Validate + keep the eager order relation in sync (or it re-writes the FK).
    const targetOrderId =
      dto.orderId !== undefined ? dto.orderId : rack.orderId;
    if (targetOrderId) {
      await this.assertOrderForZone(targetOrderId, rack.zone);
    }
    if (dto.orderId !== undefined) {
      rack.order = dto.orderId ? ({ id: dto.orderId } as Order) : null;
    }

    const { zoneId: _zoneId, orderId: _orderId, ...rest } = dto;
    Object.assign(rack, rest);

    await this.racksRepository.save(rack);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const rack = await this.findOne(id);
    await this.racksRepository.softRemove(rack);
  }

  private async assertCodeAvailable(
    zoneId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.racksRepository.findByZoneAndCode(zoneId, code);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Rack code "${code}" already exists in this zone`,
      );
    }
  }

  /** A rack can only be dedicated to an order of its zone's project. */
  private async assertOrderForZone(orderId: string, zone: Zone): Promise<void> {
    if (!zone.projectId) {
      throw new BadRequestException(
        'Assign the zone to a project before dedicating a rack to an order',
      );
    }
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    if (order.projectId !== zone.projectId) {
      throw new BadRequestException(
        "Order does not belong to this zone's project",
      );
    }
  }
}
