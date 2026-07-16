import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ToolUsage } from './entities/tool-usage.entity';
import { ToolUsageStatus } from './enums/tool-usage-status.enum';

export interface ToolUsageSummary {
  sessions: number;
  totalMinutes: number;
  totalQuantity: number;
}

@Injectable()
export class ToolUsagesRepository {
  constructor(
    @InjectRepository(ToolUsage)
    private readonly repo: Repository<ToolUsage>,
  ) {}

  create(data: Partial<ToolUsage>): ToolUsage {
    return this.repo.create(data);
  }

  save(usage: ToolUsage): Promise<ToolUsage> {
    return this.repo.save(usage);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof ToolUsage;
    order: 'ASC' | 'DESC';
    toolId?: string;
    status?: ToolUsageStatus;
  }): Promise<[ToolUsage[], number]> {
    const where: FindOptionsWhere<ToolUsage> = {};
    if (options.toolId) where.toolId = options.toolId;
    if (options.status) where.status = options.status;

    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  /** The single ONGOING usage session for a tool, if any. */
  findOngoingByTool(toolId: string): Promise<ToolUsage | null> {
    return this.repo.findOne({
      where: { toolId, status: ToolUsageStatus.Ongoing },
    });
  }

  /** Cumulative usage metrics (completed sessions) for a tool. */
  async summaryByTool(toolId: string): Promise<ToolUsageSummary> {
    const raw = await this.repo
      .createQueryBuilder('u')
      .select('COUNT(*)', 'sessions')
      .addSelect('COALESCE(SUM(u.duration_minutes), 0)', 'totalMinutes')
      .addSelect('COALESCE(SUM(u.quantity), 0)', 'totalQuantity')
      .where('u.tool_id = :toolId', { toolId })
      .andWhere('u.status = :status', { status: ToolUsageStatus.Completed })
      .getRawOne<{
        sessions: string;
        totalMinutes: string;
        totalQuantity: string;
      }>();

    return {
      sessions: raw ? parseInt(raw.sessions, 10) || 0 : 0,
      totalMinutes: raw ? parseFloat(raw.totalMinutes) || 0 : 0,
      totalQuantity: raw ? parseFloat(raw.totalQuantity) || 0 : 0,
    };
  }
}
