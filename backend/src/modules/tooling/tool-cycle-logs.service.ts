import { Injectable } from '@nestjs/common';
import { ToolCycleLog } from './entities/tool-cycle-log.entity';
import { ToolCycleLogsRepository } from './tool-cycle-logs.repository';

@Injectable()
export class ToolCycleLogsService {
  constructor(private readonly logsRepository: ToolCycleLogsRepository) {}

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof ToolCycleLog;
    order: 'ASC' | 'DESC';
    toolId?: string;
  }): Promise<[ToolCycleLog[], number]> {
    return this.logsRepository.findAndCount(options);
  }
}
