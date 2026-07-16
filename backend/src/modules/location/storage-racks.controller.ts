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
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { resolveListQuery } from '../../common/query/list-query.util';
import { CreateStorageRackDto } from './dto/create-storage-rack.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { UpdateStorageRackDto } from './dto/update-storage-rack.dto';
import { StorageRack } from './entities/storage-rack.entity';
import { StorageRacksService } from './storage-racks.service';

const SORTABLE: ReadonlyArray<keyof StorageRack> = [
  'code',
  'isActive',
  'createdAt',
];

/** Racks of a LOCATION's storage area — not inventory racks. */
@ApiTags('storage-racks')
@ApiBearerAuth('access-token')
@Controller('storage-racks')
export class StorageRacksController {
  constructor(private readonly service: StorageRacksService) {}

  @RequirePermissions('storage-racks:read')
  @Get()
  @ApiOperation({ summary: 'List storage racks (filter by location/storage)' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StorageRack[]> {
    const opts = resolveListQuery<StorageRack>(query, SORTABLE, 'code', 'ASC');
    const [items, total] = await this.service.findPaginated({
      ...opts,
      q: query.q,
      locationId: query.locationId,
      storageId: query.storageId,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('storage-racks:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a storage rack by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StorageRack> {
    return this.service.findOne(id);
  }

  @RequirePermissions('storage-racks:create')
  @Post()
  @ApiOperation({ summary: "Create a rack in a location's storage area" })
  create(@Body() dto: CreateStorageRackDto): Promise<StorageRack> {
    return this.service.create(dto);
  }

  @RequirePermissions('storage-racks:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a storage rack' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStorageRackDto,
  ): Promise<StorageRack> {
    return this.service.update(id, dto);
  }

  @RequirePermissions('storage-racks:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a storage rack' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
