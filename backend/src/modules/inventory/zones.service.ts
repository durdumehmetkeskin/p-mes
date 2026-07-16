import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Project } from '../project/entities/project.entity';
import { Rack } from './entities/rack.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { Zone } from './entities/zone.entity';
import { WarehousesService } from './warehouses.service';
import { ZonesRepository } from './zones.repository';

@Injectable()
export class ZonesService {
  constructor(
    private readonly zonesRepository: ZonesRepository,
    private readonly warehousesService: WarehousesService,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(Rack)
    private readonly racks: Repository<Rack>,
  ) {}

  async create(dto: CreateZoneDto): Promise<Zone> {
    const warehouse = await this.warehousesService.findOne(dto.warehouseId);
    await this.assertCodeAvailable(dto.warehouseId, dto.code);
    if (dto.projectId) await this.assertProjectExists(dto.projectId);

    const { warehouseId: _warehouseId, ...rest } = dto;
    const zone = this.zonesRepository.create(rest);
    zone.warehouse = warehouse;

    const saved = await this.zonesRepository.save(zone);
    return this.findOne(saved.id);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Zone;
    order: 'ASC' | 'DESC';
    q?: string;
    warehouseId?: string;
    projectId?: string;
  }): Promise<[Zone[], number]> {
    return this.zonesRepository.findAndCount(options);
  }

  async findOne(id: string): Promise<Zone> {
    const zone = await this.zonesRepository.findById(id);
    if (!zone) {
      throw new NotFoundException(`Zone ${id} not found`);
    }
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto): Promise<Zone> {
    const zone = await this.findOne(id);

    const targetWarehouseId = dto.warehouseId ?? zone.warehouseId;
    const targetCode = dto.code ?? zone.code;

    if (targetWarehouseId !== zone.warehouseId || targetCode !== zone.code) {
      await this.assertCodeAvailable(targetWarehouseId, targetCode, id);
    }

    if (dto.warehouseId && dto.warehouseId !== zone.warehouseId) {
      zone.warehouse = await this.warehousesService.findOne(dto.warehouseId);
    }

    // Changing the zone's project would orphan any order-dedicated racks under
    // it (their order belongs to the old project) — block it.
    if (
      dto.projectId !== undefined &&
      (dto.projectId ?? null) !== zone.projectId
    ) {
      if (dto.projectId) await this.assertProjectExists(dto.projectId);
      const dedicated = await this.racks.count({
        where: { zoneId: id, orderId: Not(IsNull()) },
      });
      if (dedicated > 0) {
        throw new BadRequestException(
          "Clear this zone's racks' order dedications before changing its project",
        );
      }
      // Keep the eager relation in sync or it would re-write a cleared FK.
      zone.project = dto.projectId ? ({ id: dto.projectId } as Project) : null;
    }

    const { warehouseId: _warehouseId, projectId: _projectId, ...rest } = dto;
    Object.assign(zone, rest);

    await this.zonesRepository.save(zone);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const zone = await this.findOne(id);
    await this.zonesRepository.softRemove(zone);
  }

  private async assertCodeAvailable(
    warehouseId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.zonesRepository.findByWarehouseAndCode(
      warehouseId,
      code,
    );
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Zone code "${code}" already exists in this warehouse`,
      );
    }
  }

  private async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }
}
