import { Controller, Get, Query, Res } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ListToolUsagesQueryDto } from './dto/list-tool-usages-query.dto';
import { ToolUsage } from './entities/tool-usage.entity';
import {
  ToolUsageSummary,
  ToolUsagesRepository,
} from './tool-usages.repository';
import { ToolUsagesService } from './tool-usages.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof ToolUsage> = [
  'id',
  'status',
  'startedAt',
  'endedAt',
  'createdAt',
];

@ApiTags('tool-usages')
@ApiBearerAuth('access-token')
@Controller('tool-usages')
export class ToolUsagesController {
  constructor(
    private readonly usagesService: ToolUsagesService,
    private readonly usagesRepository: ToolUsagesRepository,
  ) {}

  // Cumulative usage metrics for a tool (completed sessions).
  @RequirePermissions('tool-usages:read')
  @Get('summary')
  @ApiOperation({ summary: 'Cumulative usage metrics for a tool' })
  summary(@Query('toolId') toolId?: string): Promise<ToolUsageSummary> {
    if (!toolId) {
      return Promise.resolve({
        sessions: 0,
        totalMinutes: 0,
        totalQuantity: 0,
      });
    }
    return this.usagesRepository.summaryByTool(toolId);
  }

  // Read-only — entries are created via POST /tools/:id/usage/start|end.
  @RequirePermissions('tool-usages:read')
  @Get()
  @ApiOperation({
    summary: 'List tool usage sessions (paginated, filter by tool/status)',
  })
  async findAll(
    @Query() query: ListToolUsagesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ToolUsage[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof ToolUsage)
      ? (query._sort as keyof ToolUsage)
      : 'startedAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.usagesService.findPaginated({
      skip,
      take,
      sort,
      order,
      toolId: query.toolId,
      status: query.status,
    });

    res.setHeader('x-total-count', total);
    return items;
  }
}
