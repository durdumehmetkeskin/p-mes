import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ToolCycleLog } from './entities/tool-cycle-log.entity';

@Injectable()
export class ToolCycleLogsRepository {
  constructor(
    @InjectRepository(ToolCycleLog)
    private readonly repo: Repository<ToolCycleLog>,
  ) {}

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof ToolCycleLog;
    order: 'ASC' | 'DESC';
    toolId?: string;
  }): Promise<[ToolCycleLog[], number]> {
    const where: FindOptionsWhere<ToolCycleLog> = {};
    if (options.toolId) where.toolId = options.toolId;

    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }
}
