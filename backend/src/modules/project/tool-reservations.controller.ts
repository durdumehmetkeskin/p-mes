import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { WarehouseScoped } from '../auth/decorators/warehouse-scoped.decorator';
import { WarehouseScopeService } from '../inventory/warehouse-scope.service';
import type { User } from '../users/entities/user.entity';
import { ToolReservationStatus } from './enums/tool-reservation-status.enum';
import { ToolReservationsService } from './tool-reservations.service';

@ApiTags('tool-reservations')
@ApiBearerAuth('access-token')
@Controller()
export class ToolReservationsController {
  constructor(private readonly service: ToolReservationsService) {}

  // Per-tool reservations — powers the QR handover screen + the tool calendar.
  @RequirePermissions('tools:read')
  @Get('tools/:id/reservations')
  @ApiOperation({
    summary: "A tool's stage reservations (+ stage dates/status)",
  })
  listForTool(@Param('id', ParseUUIDPipe) id: string): Promise<unknown[]> {
    return this.service.listForTool(id);
  }

  // Warehouse-scoped pending queue for the crib (My Warehouse hub). Defaults to
  // the crib-actionable statuses (reserved awaiting deliver, returning awaiting
  // receive-return).
  @RequirePermissions('tools:read')
  @WarehouseScoped()
  @Get('tool-reservations')
  @ApiOperation({
    summary: 'Pending tool reservations for the caller’s warehouses',
  })
  listPending(
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
  ): Promise<unknown[]> {
    const all = Object.values(ToolReservationStatus);
    const parsed = (status ? status.split(',') : [])
      .map((s) => s.trim())
      .filter((s): s is ToolReservationStatus =>
        all.includes(s as ToolReservationStatus),
      );
    const statuses = parsed.length
      ? parsed
      : [ToolReservationStatus.Reserved, ToolReservationStatus.Returning];
    return this.service.listPending(
      WarehouseScopeService.resolveScope(user, 'tools:read'),
      statuses,
      warehouseId,
    );
  }

  // Crib side — permission-keyed (mirrors stock-item deliver being warehouse-side).
  @RequirePermissions('tools:handover')
  @Post('tool-reservations/:rid/deliver')
  @ApiOperation({
    summary: 'Crib hands the reserved tool out (→ delivering, in_use)',
  })
  deliver(
    @Param('rid', ParseUUIDPipe) rid: string,
    @CurrentUser() user: User,
  ): Promise<unknown[]> {
    return this.service.deliver(rid, user);
  }

  // Stage side — no permission key; the service authorizes the stage responsible.
  @Post('tool-reservations/:rid/receive')
  @ApiOperation({ summary: 'Stage responsible receives the tool (→ received)' })
  receive(
    @Param('rid', ParseUUIDPipe) rid: string,
    @CurrentUser() user: User,
  ): Promise<unknown[]> {
    return this.service.receive(rid, user);
  }

  @Post('tool-reservations/:rid/return')
  @ApiOperation({
    summary: 'Stage returns the tool after completion (→ returning)',
  })
  returnTool(
    @Param('rid', ParseUUIDPipe) rid: string,
    @CurrentUser() user: User,
  ): Promise<unknown[]> {
    return this.service.returnTool(rid, user);
  }

  @RequirePermissions('tools:handover')
  @Post('tool-reservations/:rid/receive-return')
  @ApiOperation({
    summary: 'Crib receives the returned tool back (→ returned, available)',
  })
  receiveReturn(
    @Param('rid', ParseUUIDPipe) rid: string,
    @CurrentUser() user: User,
  ): Promise<unknown[]> {
    return this.service.receiveReturn(rid, user);
  }
}
