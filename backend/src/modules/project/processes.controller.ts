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
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { User } from '../users/entities/user.entity';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpsertCompletionReportDto } from './dto/upsert-completion-report.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { ProcessCompletionReport } from './entities/process-completion-report.entity';
import { Process } from './entities/process.entity';
import { ProcessesService } from './processes.service';
import { resolveListQuery } from '../../common/query/list-query.util';

const SORTABLE: ReadonlyArray<keyof Process> = [
  'category',
  'overallStatus',
  'createdAt',
  'updatedAt',
];

@ApiTags('processes')
@ApiBearerAuth('access-token')
@Controller('processes')
export class ProcessesController {
  constructor(private readonly service: ProcessesService) {}

  @RequirePermissions('processes:read')
  @Get()
  @ApiOperation({ summary: 'List processes (filter by order)' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ): Promise<Process[]> {
    const opts = resolveListQuery<Process>(query, SORTABLE, 'createdAt');
    const [items, total] = await this.service.findPaginated({
      ...opts,
      orderId: query.orderId,
      orderItemId: query.orderItemId,
      user,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('processes:read')
  @Get(':id/completion-report')
  @ApiOperation({ summary: 'Get the process completion report (or null)' })
  getCompletionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ProcessCompletionReport | null> {
    return this.service.getCompletionReport(id, user);
  }

  @RequirePermissions('processes:update')
  @Put(':id/completion-report')
  @ApiOperation({
    summary: 'Create/update the process completion report (must be completed)',
  })
  upsertCompletionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCompletionReportDto,
    @CurrentUser() user: User,
  ): Promise<ProcessCompletionReport> {
    return this.service.upsertCompletionReport(id, dto, user);
  }

  @RequirePermissions('processes:update')
  @Delete(':id/completion-report')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete the process completion report' })
  removeCompletionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.service.removeCompletionReport(id, user);
  }

  @RequirePermissions('processes:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a process with its ordered stages' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Process> {
    return this.service.findOneWithStages(id, user);
  }

  // Generates a process for an order, copying template stages independently.
  @RequirePermissions('processes:create')
  @Post()
  @ApiOperation({
    summary: 'Create a process for an order (clones template stages)',
  })
  create(
    @Body() dto: CreateProcessDto,
    @CurrentUser() user: User,
  ): Promise<Process> {
    return this.service.create(dto, user);
  }

  @RequirePermissions('processes:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a process (e.g. its responsible user)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProcessDto,
    @CurrentUser() user: User,
  ): Promise<Process> {
    return this.service.update(id, dto, user);
  }

  @RequirePermissions('processes:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a process and its stages' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.service.remove(id, user);
  }
}
