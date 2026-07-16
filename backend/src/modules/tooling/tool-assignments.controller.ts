import { Controller, Get, Query, Res } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ListToolAssignmentsQueryDto } from './dto/list-tool-assignments-query.dto';
import { ToolAssignment } from './entities/tool-assignment.entity';
import { ToolAssignmentsService } from './tool-assignments.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof ToolAssignment> = [
  'id',
  'assignedTo',
  'status',
  'createdAt',
];

@ApiTags('tool-assignments')
@ApiBearerAuth('access-token')
@Controller('tool-assignments')
export class ToolAssignmentsController {
  constructor(private readonly assignmentsService: ToolAssignmentsService) {}

  // Read-only — entries are created via POST /tools/:id/assign|return.
  @RequirePermissions('tool-assignments:read')
  @Get()
  @ApiOperation({
    summary: 'List tool assignments (paginated, filter by tool/status)',
  })
  async findAll(
    @Query() query: ListToolAssignmentsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ToolAssignment[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof ToolAssignment)
      ? (query._sort as keyof ToolAssignment)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.assignmentsService.findPaginated({
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
