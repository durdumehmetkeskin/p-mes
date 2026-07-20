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
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { User } from '../users/entities/user.entity';
import { CreateSectionDto } from './dto/create-section.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { SectionScheduleQueryDto } from './dto/section-schedule-query.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { Section } from './entities/section.entity';
import { resolveListQuery } from '../../common/query/list-query.util';
import {
  SectionSchedule,
  SectionScheduleService,
} from './section-schedule.service';
import { SectionsService } from './sections.service';

const SORTABLE: ReadonlyArray<keyof Section> = [
  'code',
  'name',
  'isActive',
  'createdAt',
];

@ApiTags('sections')
@ApiBearerAuth('access-token')
@Controller('sections')
export class SectionsController {
  constructor(
    private readonly service: SectionsService,
    private readonly scheduleService: SectionScheduleService,
  ) {}

  @RequirePermissions('sections:read')
  @Get()
  @ApiOperation({ summary: 'List sections (filter by location)' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Section[]> {
    const opts = resolveListQuery<Section>(query, SORTABLE, 'code', 'ASC');
    const [items, total] = await this.service.findPaginated({
      ...opts,
      locationId: query.locationId,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('sections:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a section by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Section> {
    return this.service.findOne(id);
  }

  // Exposes reservations + reserved orders' stage schedules — gated on the
  // reservation read permission, not the plain section read.
  @RequirePermissions('section-reservations:read')
  @Get(':id/schedule')
  @ApiOperation({
    summary:
      "Section detail Gantt feed: reservations + reserved orders' stages",
  })
  schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SectionScheduleQueryDto,
    @CurrentUser() user: User,
  ): Promise<SectionSchedule> {
    return this.scheduleService.scheduleForSection(id, {
      from: query.from,
      to: query.to,
      user,
    });
  }

  @RequirePermissions('sections:create')
  @Post()
  @ApiOperation({ summary: 'Create a section (admin only)' })
  create(@Body() dto: CreateSectionDto): Promise<Section> {
    return this.service.create(dto);
  }

  @RequirePermissions('sections:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a section (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<Section> {
    return this.service.update(id, dto);
  }

  @RequirePermissions('sections:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a section (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
