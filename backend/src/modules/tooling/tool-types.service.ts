import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateToolTypeDto } from './dto/create-tool-type.dto';
import { UpdateToolTypeDto } from './dto/update-tool-type.dto';
import { ToolType } from './entities/tool-type.entity';
import { ToolTypesRepository } from './tool-types.repository';

@Injectable()
export class ToolTypesService {
  constructor(private readonly toolTypesRepository: ToolTypesRepository) {}

  async create(dto: CreateToolTypeDto): Promise<ToolType> {
    await this.assertNameAvailable(dto.name);
    const type = this.toolTypesRepository.create(dto);
    return this.toolTypesRepository.save(type);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof ToolType;
    order: 'ASC' | 'DESC';
  }): Promise<[ToolType[], number]> {
    return this.toolTypesRepository.findAndCount(options);
  }

  async findOne(id: string): Promise<ToolType> {
    const type = await this.toolTypesRepository.findById(id);
    if (!type) {
      throw new NotFoundException(`Tool type ${id} not found`);
    }
    return type;
  }

  async update(id: string, dto: UpdateToolTypeDto): Promise<ToolType> {
    const type = await this.findOne(id);

    if (dto.name && dto.name !== type.name) {
      await this.assertNameAvailable(dto.name);
      type.name = dto.name;
    }
    if (dto.description !== undefined) type.description = dto.description;
    if (dto.isActive !== undefined) type.isActive = dto.isActive;

    return this.toolTypesRepository.save(type);
  }

  async remove(id: string): Promise<void> {
    const type = await this.findOne(id);
    await this.toolTypesRepository.softRemove(type);
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const existing = await this.toolTypesRepository.findByName(name);
    if (existing) {
      throw new ConflictException(`Tool type "${name}" already exists`);
    }
  }
}
