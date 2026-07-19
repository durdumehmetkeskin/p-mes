import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { User } from '../users/entities/user.entity';
import { AddProcessStageDto } from './dto/add-process-stage.dto';
import { ReorderProcessStagesDto } from './dto/reorder-process-stages.dto';
import { SetProcessStageLinksDto } from './dto/set-process-stage-links.dto';
import { ReserveStageToolDto } from './dto/reserve-stage-tool.dto';
import { UpdateStageDirectivesDto } from './dto/update-stage-directives.dto';
import { UpdateStageToolReservationDto } from './dto/update-stage-tool-reservation.dto';
import { UpdateProcessStageStatusDto } from './dto/update-process-stage-status.dto';
import { UpdateProcessStageDto } from './dto/update-process-stage.dto';
import { UpsertCompletionReportDto } from './dto/upsert-completion-report.dto';
import { ProcessStage } from './entities/process-stage.entity';
import { StageCompletionReport } from './entities/stage-completion-report.entity';
import { ProcessStagesService } from './process-stages.service';

@ApiTags('process-stages')
@ApiBearerAuth('access-token')
@Controller()
export class ProcessStagesController {
  constructor(private readonly service: ProcessStagesService) {}

  // Stages of an order (via its items' processes) — powers the stock-item
  // reserve stage picker.
  @RequirePermissions('orders:read')
  @Get('orders/:orderId/stages')
  @ApiOperation({ summary: "List an order's process stages" })
  findByOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
  ): Promise<ProcessStage[]> {
    return this.service.findByOrder(orderId, user);
  }

  // No @RequirePermissions: authorization is decided in the service — only the
  // owning process's responsible user or an admin may edit its stages.
  @Post('processes/:processId/stages')
  @ApiOperation({
    summary: 'Append a stage to a process (process responsible or admin)',
  })
  addStage(
    @Param('processId', ParseUUIDPipe) processId: string,
    @Body() dto: AddProcessStageDto,
    @CurrentUser() user: User,
  ): Promise<ProcessStage> {
    return this.service.addStage(processId, dto, user);
  }

  // Authorization in the service: process responsible or admin.
  @Post('processes/:processId/stages/reorder')
  @ApiOperation({
    summary:
      'Reorder stages linearly (replaces dependency links with a chain; draft only; process responsible or admin)',
  })
  reorder(
    @Param('processId', ParseUUIDPipe) processId: string,
    @Body() dto: ReorderProcessStagesDto,
    @CurrentUser() user: User,
  ): Promise<ProcessStage[]> {
    return this.service.reorder(processId, dto, user);
  }

  // Authorization in the service: process responsible or admin.
  @Put('processes/:processId/stages/links')
  @ApiOperation({
    summary:
      "Replace the process's stage dependency links (DAG; draft only; process responsible or admin)",
  })
  setLinks(
    @Param('processId', ParseUUIDPipe) processId: string,
    @Body() dto: SetProcessStageLinksDto,
    @CurrentUser() user: User,
  ): Promise<ProcessStage[]> {
    return this.service.setLinks(processId, dto, user);
  }

  // Authorization in the service: process responsible or admin.
  @Patch('process-stages/:id')
  @ApiOperation({
    summary: 'Edit an order-specific stage (process responsible or admin)',
  })
  updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProcessStageDto,
    @CurrentUser() user: User,
  ): Promise<ProcessStage> {
    return this.service.updateStage(id, dto, user);
  }

  // No @RequirePermissions: service-enforced relationship auth — only the
  // STAGE's responsible user or an admin may write directives.
  @Put('process-stages/:id/directives')
  @ApiOperation({
    summary: 'Set the stage work directives (stage responsible or admin)',
  })
  updateDirectives(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStageDirectivesDto,
    @CurrentUser() user: User,
  ): Promise<ProcessStage> {
    return this.service.updateDirectives(id, dto.directives, user);
  }

  // No @RequirePermissions: authorization is decided in the service — admin
  // or process responsible for any transition; a stage worker may only
  // start/complete a stage they work on.
  @Patch('process-stages/:id/status')
  @ApiOperation({
    summary:
      'Change stage status (DAG gating; admin/process responsible any, stage worker start/complete only)',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProcessStageStatusDto,
    @CurrentUser() user: User,
  ): Promise<ProcessStage> {
    return this.service.updateStatus(id, dto.status, user, dto.durationHours);
  }

  // No @RequirePermissions: authorization is decided in the service — only the
  // owning process's responsible user or an admin may delete a stage.
  @Delete('process-stages/:id')
  @HttpCode(204)
  @ApiOperation({
    summary:
      'Remove a stage and resequence (process responsible or admin only)',
  })
  removeStage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.service.removeStage(id, user);
  }

  @RequirePermissions('process-stages:read')
  @Get('process-stages/:id/stock-items')
  @ApiOperation({
    summary: 'List stock items reserved for this stage (reservation/handover)',
  })
  stockItems(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<unknown[]> {
    return this.service.stockItemsForStage(id, user);
  }

  // --- tool reservations ---

  @RequirePermissions('process-stages:read')
  @Get('process-stages/:id/tool-reservations')
  @ApiOperation({
    summary: 'List tools reserved for this stage (+availability)',
  })
  listToolReservations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<unknown[]> {
    return this.service.listToolReservations(id, user);
  }

  // No @RequirePermissions on the three tool-reservation mutations below:
  // the service authorizes admin ∨ process-stages:reserve-tools key holders
  // ∨ the owning PROCESS RESPONSIBLE (who may hold no global key).
  @Post('process-stages/:id/tool-reservations')
  @ApiOperation({
    summary: 'Reserve a tool for this stage (responsible/key/admin)',
  })
  reserveTool(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReserveStageToolDto,
    @CurrentUser() user: User,
  ): Promise<unknown[]> {
    return this.service.reserveTool(id, dto, user);
  }

  @Patch('process-stages/:id/tool-reservations/:reservationId')
  @ApiOperation({
    summary: 'Re-date a tool reservation (still-reserved only)',
  })
  updateToolReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() dto: UpdateStageToolReservationDto,
    @CurrentUser() user: User,
  ): Promise<unknown[]> {
    return this.service.updateToolReservation(id, reservationId, dto, user);
  }

  @Delete('process-stages/:id/tool-reservations/:reservationId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a tool reservation from this stage' })
  removeToolReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.service.removeToolReservation(id, reservationId, user);
  }

  @RequirePermissions('process-stages:read')
  @Get('process-stages/:id/material-usage')
  @ApiOperation({
    summary: 'Per-material quantity actually used (consumed) at this stage',
  })
  materialUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<unknown[]> {
    return this.service.stageMaterialUsage(id, user);
  }

  // --- completion report ---

  @RequirePermissions('process-stages:read')
  @Get('process-stages/:id/completion-report')
  @ApiOperation({ summary: 'Get the stage completion report (or null)' })
  getCompletionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<StageCompletionReport | null> {
    return this.service.getCompletionReport(id, user);
  }

  @RequirePermissions('process-stages:update')
  @Put('process-stages/:id/completion-report')
  @ApiOperation({
    summary:
      'Create/update the stage completion report (stage must be completed)',
  })
  upsertCompletionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCompletionReportDto,
    @CurrentUser() user: User,
  ): Promise<StageCompletionReport> {
    return this.service.upsertCompletionReport(id, dto, user);
  }

  @RequirePermissions('process-stages:update')
  @Delete('process-stages/:id/completion-report')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete the stage completion report' })
  removeCompletionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.service.removeCompletionReport(id, user);
  }
}
