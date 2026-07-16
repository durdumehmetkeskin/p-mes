import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReportDefinitionDto } from './dto/create-report-definition.dto';
import { UpdateReportDefinitionDto } from './dto/update-report-definition.dto';
import { ReportDefinition } from './entities/report-definition.entity';
import { ReportDefinitionsRepository } from './report-definitions.repository';

@Injectable()
export class ReportDefinitionsService {
  constructor(private readonly repository: ReportDefinitionsRepository) {}

  async create(dto: CreateReportDefinitionDto): Promise<ReportDefinition> {
    await this.assertKeyAvailable(dto.key);
    const definition = this.repository.create({
      ...dto,
      description: dto.description ?? null,
      helpers: dto.helpers ?? null,
      isActive: dto.isActive ?? true,
      isSystem: false,
    });
    return this.repository.save(definition);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof ReportDefinition;
    order: 'ASC' | 'DESC';
  }): Promise<[ReportDefinition[], number]> {
    return this.repository.findAndCount(options);
  }

  async findOne(id: string): Promise<ReportDefinition> {
    const definition = await this.repository.findById(id);
    if (!definition) {
      throw new NotFoundException(`Report definition ${id} not found`);
    }
    return definition;
  }

  async update(
    id: string,
    dto: UpdateReportDefinitionDto,
  ): Promise<ReportDefinition> {
    const definition = await this.findOne(id);
    // The `key` is immutable (omitted from the DTO); everything else — including
    // the template body of system reports — is editable. Only assign fields the
    // caller actually sent so unrelated columns are never cleared.
    if (dto.name !== undefined) definition.name = dto.name;
    if (dto.description !== undefined) definition.description = dto.description;
    if (dto.dataSource !== undefined) definition.dataSource = dto.dataSource;
    if (dto.recipe !== undefined) definition.recipe = dto.recipe;
    if (dto.engine !== undefined) definition.engine = dto.engine;
    if (dto.content !== undefined) definition.content = dto.content;
    if (dto.helpers !== undefined) definition.helpers = dto.helpers;
    if (dto.isActive !== undefined) definition.isActive = dto.isActive;
    return this.repository.save(definition);
  }

  async remove(id: string): Promise<void> {
    const definition = await this.findOne(id);
    if (definition.isSystem) {
      throw new ForbiddenException('System reports cannot be deleted');
    }
    await this.repository.softRemove(definition);
  }

  private async assertKeyAvailable(key: string): Promise<void> {
    const existing = await this.repository.findByKey(key);
    if (existing) {
      throw new ConflictException(`Report "${key}" already exists`);
    }
  }
}
