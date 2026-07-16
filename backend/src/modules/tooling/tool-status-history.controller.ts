import { Controller, Get, Query, Res } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ListToolStatusHistoryQueryDto } from './dto/list-tool-status-history-query.dto';
import { ToolStatusHistory } from './entities/tool-status-history.entity';
import { ToolStatusHistoryService } from './tool-status-history.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof ToolStatusHistory> = [
  'id',
  'toStatus',
  'createdAt',
];

@ApiTags('tool-status-history')
@ApiBearerAuth('access-token')
@Controller('tool-status-history')
export class ToolStatusHistoryController {
  constructor(private readonly historyService: ToolStatusHistoryService) {}

  // Read-only — entries are created only via PATCH /tools/:id/status.
  @RequirePermissions('tool-status-history:read')
  @Get()
  @ApiOperation({
    summary: 'List tool status changes (paginated, filter by tool)',
  })
  async findAll(
    @Query() query: ListToolStatusHistoryQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ToolStatusHistory[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(
      query._sort as keyof ToolStatusHistory,
    )
      ? (query._sort as keyof ToolStatusHistory)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.historyService.findPaginated({
      skip,
      take,
      sort,
      order,
      toolId: query.toolId,
    });

    res.setHeader('x-total-count', total);
    return items;
  }
}
