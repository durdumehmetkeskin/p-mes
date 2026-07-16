import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuditService } from './audit.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLog } from './entities/audit-log.entity';

const SORTABLE_FIELDS: ReadonlyArray<keyof AuditLog> = [
  'id',
  'action',
  'entity',
  'entityId',
  'actorEmail',
  'createdAt',
];

@ApiTags('audit-logs')
@ApiBearerAuth('access-token')
@RequirePermissions('audit:view') // the audit trail is admin-only and read-only
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (paginated, admin only)' })
  async findAll(
    @Query() query: ListAuditLogsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuditLog[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof AuditLog)
      ? (query._sort as keyof AuditLog)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.auditService.findPaginated({
      skip,
      take,
      sort,
      order,
      filters: {
        action: query.action,
        entity: query.entity,
        actorId: query.actorId,
      },
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @Get('entities')
  @ApiOperation({ summary: 'Distinct entity names present in the audit trail' })
  entities(): Promise<string[]> {
    return this.auditService.distinctEntities();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single audit log entry (admin only)' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AuditLog> {
    return this.auditService.findOne(id);
  }
}
