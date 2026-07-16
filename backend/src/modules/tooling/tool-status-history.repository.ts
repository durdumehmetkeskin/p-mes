import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ToolStatusHistory } from './entities/tool-status-history.entity';

@Injectable()
export class ToolStatusHistoryRepository {
  constructor(
    @InjectRepository(ToolStatusHistory)
    private readonly repo: Repository<ToolStatusHistory>,
  ) {}

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof ToolStatusHistory;
    order: 'ASC' | 'DESC';
    toolId?: string;
  }): Promise<[ToolStatusHistory[], number]> {
    const where: FindOptionsWhere<ToolStatusHistory> = {};
    if (options.toolId) where.toolId = options.toolId;

    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }
}
