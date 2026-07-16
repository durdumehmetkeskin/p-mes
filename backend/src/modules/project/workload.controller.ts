import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { WorkloadService, type WorkloadUser } from './workload.service';

@ApiTags('workload')
@ApiBearerAuth('access-token')
@Controller('workload')
export class WorkloadController {
  constructor(private readonly service: WorkloadService) {}

  @RequirePermissions('workload:read')
  @Get()
  @ApiOperation({
    summary: 'Per-user assigned work for the Gantt / workload view',
  })
  workload(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<WorkloadUser[]> {
    return this.service.getWorkload(from, to);
  }
}
