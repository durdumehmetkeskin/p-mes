import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMaterialTypeDto } from './dto/create-material-type.dto';
import { UpdateMaterialTypeDto } from './dto/update-material-type.dto';
import { MaterialType } from './entities/material-type.entity';
import { MaterialTypesRepository } from './material-types.repository';

@Injectable()
export class MaterialTypesService {
  constructor(
    private readonly materialTypesRepository: MaterialTypesRepository,
  ) {}

  async create(dto: CreateMaterialTypeDto): Promise<MaterialType> {
    await this.assertNameAvailable(dto.name);
    const type = this.materialTypesRepository.create(dto);
    return this.materialTypesRepository.save(type);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof MaterialType;
    order: 'ASC' | 'DESC';
  }): Promise<[MaterialType[], number]> {
    return this.materialTypesRepository.findAndCount(options);
  }

  async findOne(id: string): Promise<MaterialType> {
    const type = await this.materialTypesRepository.findById(id);
    if (!type) {
      throw new NotFoundException(`Material type ${id} not found`);
    }
    return type;
  }

  async update(id: string, dto: UpdateMaterialTypeDto): Promise<MaterialType> {
    const type = await this.findOne(id);

    if (dto.name && dto.name !== type.name) {
      await this.assertNameAvailable(dto.name);
      type.name = dto.name;
    }
    if (dto.description !== undefined) type.description = dto.description;
    if (dto.isActive !== undefined) type.isActive = dto.isActive;

    return this.materialTypesRepository.save(type);
  }

  async remove(id: string): Promise<void> {
    const type = await this.findOne(id);
    await this.materialTypesRepository.softRemove(type);
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const existing = await this.materialTypesRepository.findByName(name);
    if (existing) {
      throw new ConflictException(`Material type "${name}" already exists`);
    }
  }
}
