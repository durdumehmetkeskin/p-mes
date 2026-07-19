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
import { CreateLocationDto } from './dto/create-location.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { SectionScheduleQueryDto } from './dto/section-schedule-query.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './entities/location.entity';
import { resolveListQuery } from '../../common/query/list-query.util';
import { LocationsService, LocationStorageView } from './locations.service';
import {
  LocationSchedule,
  SectionScheduleService,
} from './section-schedule.service';

const SORTABLE: ReadonlyArray<keyof Location> = [
  'code',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('locations')
@ApiBearerAuth('access-token')
@Controller('locations')
export class LocationsController {
  constructor(
    private readonly service: LocationsService,
    private readonly scheduleService: SectionScheduleService,
  ) {}

  @RequirePermissions('locations:read')
  @Get()
  @ApiOperation({ summary: 'List production locations (paginated)' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Location[]> {
    const opts = resolveListQuery<Location>(query, SORTABLE, 'code', 'ASC');
    const [items, total] = await this.service.findPaginated({
      ...opts,
      q: query.q,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('locations:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a location by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Location> {
    return this.service.findOne(id);
  }

  @RequirePermissions('locations:read')
  @Get(':id/storage')
  @ApiOperation({
    summary: "The location's storage area (storage + racks)",
  })
  getStorage(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LocationStorageView> {
    return this.service.getStorage(id);
  }

  // Location-wide calendar feed: every section's reservations + the reserved
  // orders' stage schedules. Members only see their member projects' rows
  // (scoping happens in the service), so plain locations:read suffices.
  @RequirePermissions('locations:read')
  @Get(':id/schedule')
  @ApiOperation({
    summary:
      "Location calendar feed: all sections' reservations + reserved orders' stages",
  })
  schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SectionScheduleQueryDto,
    @CurrentUser() user: User,
  ): Promise<LocationSchedule> {
    return this.scheduleService.scheduleForLocation(id, {
      from: query.from,
      to: query.to,
      user,
    });
  }

  @RequirePermissions('locations:create')
  @Post()
  @ApiOperation({ summary: 'Create a location (admin only)' })
  create(@Body() dto: CreateLocationDto): Promise<Location> {
    return this.service.create(dto);
  }

  @RequirePermissions('locations:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a location (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<Location> {
    return this.service.update(id, dto);
  }

  @RequirePermissions('locations:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a location (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
