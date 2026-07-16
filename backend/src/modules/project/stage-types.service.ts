import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { CreateStageTypeDto } from './dto/create-stage-type.dto';
import { UpdateStageTypeDto } from './dto/update-stage-type.dto';
import { StageType } from './entities/stage-type.entity';

@Injectable()
export class StageTypesService {
  constructor(
    @InjectRepository(StageType) private readonly repo: Repository<StageType>,
  ) {}

  async create(dto: CreateStageTypeDto): Promise<StageType> {
    const saved = await this.repo.save(this.repo.create(dto));
    // Reload so the eager category relation is populated on the response.
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateStageTypeDto): Promise<StageType> {
    const found = await this.findOne(id);
    Object.assign(found, dto);
    await this.repo.save(found);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const found = await this.findOne(id);
    await this.repo.softRemove(found);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof StageType;
    order: 'ASC' | 'DESC';
    categoryId?: string;
    projectId?: string;
  }): Promise<[StageType[], number]> {
    const base: FindOptionsWhere<StageType> = {};
    if (options.categoryId) base.categoryId = options.categoryId;
    // Global stage types (project_id IS NULL) plus the given project's own.
    const where: FindOptionsWhere<StageType>[] = options.projectId
      ? [
          { ...base, projectId: IsNull() },
          { ...base, projectId: options.projectId },
        ]
      : [{ ...base, projectId: IsNull() }];
    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  async findOne(id: string): Promise<StageType> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Stage type ${id} not found`);
    return found;
  }
}
