import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMaterialUnitDto } from './dto/create-material-unit.dto';
import { UpdateMaterialUnitDto } from './dto/update-material-unit.dto';
import { MaterialUnit } from './entities/material-unit.entity';
import { MaterialUnitsRepository } from './material-units.repository';

@Injectable()
export class MaterialUnitsService {
  constructor(
    private readonly materialUnitsRepository: MaterialUnitsRepository,
  ) {}

  async create(dto: CreateMaterialUnitDto): Promise<MaterialUnit> {
    await this.assertNameAvailable(dto.name);
    const unit = this.materialUnitsRepository.create(dto);
    return this.materialUnitsRepository.save(unit);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof MaterialUnit;
    order: 'ASC' | 'DESC';
  }): Promise<[MaterialUnit[], number]> {
    return this.materialUnitsRepository.findAndCount(options);
  }

  async findOne(id: string): Promise<MaterialUnit> {
    const unit = await this.materialUnitsRepository.findById(id);
    if (!unit) {
      throw new NotFoundException(`Material unit ${id} not found`);
    }
    return unit;
  }

  async update(id: string, dto: UpdateMaterialUnitDto): Promise<MaterialUnit> {
    const unit = await this.findOne(id);

    if (dto.name && dto.name !== unit.name) {
      await this.assertNameAvailable(dto.name);
      unit.name = dto.name;
    }
    if (dto.description !== undefined) unit.description = dto.description;
    if (dto.isActive !== undefined) unit.isActive = dto.isActive;

    return this.materialUnitsRepository.save(unit);
  }

  async remove(id: string): Promise<void> {
    const unit = await this.findOne(id);
    await this.materialUnitsRepository.softRemove(unit);
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const existing = await this.materialUnitsRepository.findByName(name);
    if (existing) {
      throw new ConflictException(`Material unit "${name}" already exists`);
    }
  }
}
