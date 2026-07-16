import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CreateZoneDto } from './dto/create-zone.dto';
import { ListZonesQueryDto } from './dto/list-zones-query.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { Zone } from './entities/zone.entity';
import { ZonesService } from './zones.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof Zone> = [
  'id',
  'code',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('zones')
@ApiBearerAuth('access-token')
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @RequirePermissions('zones:read')
  @Get()
  @ApiOperation({ summary: 'List zones (paginated, filter by warehouse)' })
  async findAll(
    @Query() query: ListZonesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Zone[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof Zone)
      ? (query._sort as keyof Zone)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.zonesService.findPaginated({
      skip,
      take,
      sort,
      order,
      q: query.q,
      warehouseId: query.warehouseId,
      projectId: query.projectId,
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('zones:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a zone by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Zone> {
    return this.zonesService.findOne(id);
  }

  @RequirePermissions('zones:create')
  @Post()
  @ApiOperation({ summary: 'Create a zone (admin only)' })
  create(@Body() dto: CreateZoneDto): Promise<Zone> {
    return this.zonesService.create(dto);
  }

  @RequirePermissions('zones:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a zone (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateZoneDto,
  ): Promise<Zone> {
    return this.zonesService.update(id, dto);
  }

  @RequirePermissions('zones:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a zone (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.zonesService.remove(id);
  }
}
