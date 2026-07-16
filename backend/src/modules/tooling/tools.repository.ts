import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { Tool } from './entities/tool.entity';
import { ToolCategory } from './enums/tool-category.enum';
import { ToolStatus } from './enums/tool-status.enum';

@Injectable()
export class ToolsRepository {
  constructor(
    @InjectRepository(Tool)
    private readonly repo: Repository<Tool>,
  ) {}

  create(data: Partial<Tool>): Tool {
    return this.repo.create(data);
  }

  save(tool: Tool): Promise<Tool> {
    return this.repo.save(tool);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof Tool;
    order: 'ASC' | 'DESC';
    q?: string;
    category?: ToolCategory;
    status?: ToolStatus;
    rackId?: string;
    warehouseId?: string;
    projectId?: string;
    // Warehouse-responsible scoping via rack -> zone -> warehouse. An empty
    // array matches nothing; tools with no rack are excluded (no warehouse).
    warehouseIds?: string[];
  }): Promise<[Tool[], number]> {
    // Common filters (category/status/rack/warehouse/project) applied to every
    // OR branch of the free-text search.
    const base: FindOptionsWhere<Tool> = {};
    if (options.category) base.category = options.category;
    if (options.status) base.status = options.status;
    if (options.rackId) base.rackId = options.rackId;
    if (options.projectId) base.projectId = options.projectId;
    if (options.warehouseIds !== undefined) {
      base.rack = { zone: { warehouseId: In(options.warehouseIds) } };
    } else if (options.warehouseId) {
      base.rack = { zone: { warehouseId: options.warehouseId } };
    }

    const where: FindOptionsWhere<Tool> | FindOptionsWhere<Tool>[] = options.q
      ? [
          { ...base, code: ILike(`%${options.q}%`) },
          { ...base, name: ILike(`%${options.q}%`) },
        ]
      : base;

    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<Tool | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Tool | null> {
    return this.repo.findOne({ where: { code } });
  }

  // Entity-based soft remove so persistence subscribers (audit log) fire.
  softRemove(tool: Tool): Promise<Tool> {
    return this.repo.softRemove(tool);
  }
}
