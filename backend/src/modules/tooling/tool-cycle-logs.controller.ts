import { Controller, Get, Query, Res } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ListToolCycleLogsQueryDto } from './dto/list-tool-cycle-logs-query.dto';
import { ToolCycleLog } from './entities/tool-cycle-log.entity';
import { ToolCycleLogsService } from './tool-cycle-logs.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof ToolCycleLog> = [
  'id',
  'cycles',
  'source',
  'createdAt',
];

@ApiTags('tool-cycle-logs')
@ApiBearerAuth('access-token')
@Controller('tool-cycle-logs')
export class ToolCycleLogsController {
  constructor(private readonly logsService: ToolCycleLogsService) {}

  // Read-only — entries are created via the cycle endpoints on /tools.
  @RequirePermissions('tool-cycle-logs:read')
  @Get()
  @ApiOperation({
    summary: 'List tool cycle-counter changes (paginated, filter by tool)',
  })
  async findAll(
    @Query() query: ListToolCycleLogsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ToolCycleLog[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof ToolCycleLog)
      ? (query._sort as keyof ToolCycleLog)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.logsService.findPaginated({
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
