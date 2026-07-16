import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { CreateStageTypeCategoryDto } from './dto/create-stage-type-category.dto';
import { UpdateStageTypeCategoryDto } from './dto/update-stage-type-category.dto';
import { StageTypeCategory } from './entities/stage-type-category.entity';

@Injectable()
export class StageTypeCategoriesService {
  constructor(
    @InjectRepository(StageTypeCategory)
    private readonly repo: Repository<StageTypeCategory>,
  ) {}

  create(dto: CreateStageTypeCategoryDto): Promise<StageTypeCategory> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(
    id: string,
    dto: UpdateStageTypeCategoryDto,
  ): Promise<StageTypeCategory> {
    const found = await this.findOne(id);
    Object.assign(found, dto);
    return this.repo.save(found);
  }

  async remove(id: string): Promise<void> {
    const found = await this.findOne(id);
    await this.repo.softRemove(found);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof StageTypeCategory;
    order: 'ASC' | 'DESC';
    projectId?: string;
  }): Promise<[StageTypeCategory[], number]> {
    // Global entries (project_id IS NULL) plus the given project's own.
    const where: FindOptionsWhere<StageTypeCategory>[] = options.projectId
      ? [{ projectId: IsNull() }, { projectId: options.projectId }]
      : [{ projectId: IsNull() }];
    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order, code: 'ASC' },
    });
  }

  async findOne(id: string): Promise<StageTypeCategory> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Stage type category ${id} not found`);
    }
    return found;
  }
}
