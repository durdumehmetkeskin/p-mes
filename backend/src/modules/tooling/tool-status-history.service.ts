import { Injectable } from '@nestjs/common';
import { ToolStatusHistory } from './entities/tool-status-history.entity';
import { ToolStatusHistoryRepository } from './tool-status-history.repository';

@Injectable()
export class ToolStatusHistoryService {
  constructor(
    private readonly historyRepository: ToolStatusHistoryRepository,
  ) {}

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof ToolStatusHistory;
    order: 'ASC' | 'DESC';
    toolId?: string;
  }): Promise<[ToolStatusHistory[], number]> {
    return this.historyRepository.findAndCount(options);
  }
}
