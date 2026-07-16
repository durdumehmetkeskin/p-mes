import { Injectable } from '@nestjs/common';
import { ToolUsage } from './entities/tool-usage.entity';
import { ToolUsageStatus } from './enums/tool-usage-status.enum';
import {
  ToolUsageSummary,
  ToolUsagesRepository,
} from './tool-usages.repository';

@Injectable()
export class ToolUsagesService {
  constructor(private readonly usagesRepository: ToolUsagesRepository) {}

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof ToolUsage;
    order: 'ASC' | 'DESC';
    toolId?: string;
    status?: ToolUsageStatus;
  }): Promise<[ToolUsage[], number]> {
    return this.usagesRepository.findAndCount(options);
  }

  summaryByTool(toolId: string): Promise<ToolUsageSummary> {
    return this.usagesRepository.summaryByTool(toolId);
  }
}
