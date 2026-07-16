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
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { ListWarehousesQueryDto } from './dto/list-warehouses-query.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { Warehouse } from './entities/warehouse.entity';
import { WarehousesService } from './warehouses.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof Warehouse> = [
  'id',
  'code',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('warehouses')
@ApiBearerAuth('access-token')
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  // Reads available to any authenticated user.
  @RequirePermissions('warehouses:read')
  @Get()
  @ApiOperation({ summary: 'List warehouses (paginated)' })
  async findAll(
    @Query() query: ListWarehousesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Warehouse[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof Warehouse)
      ? (query._sort as keyof Warehouse)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.warehousesService.findPaginated({
      skip,
      take,
      sort,
      order,
      q: query.q,
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('warehouses:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a warehouse by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Warehouse> {
    return this.warehousesService.findOne(id);
  }

  // Writes require the admin role.
  @RequirePermissions('warehouses:create')
  @Post()
  @ApiOperation({ summary: 'Create a warehouse (admin only)' })
  create(@Body() dto: CreateWarehouseDto): Promise<Warehouse> {
    return this.warehousesService.create(dto);
  }

  @RequirePermissions('warehouses:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a warehouse (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<Warehouse> {
    return this.warehousesService.update(id, dto);
  }

  @RequirePermissions('warehouses:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a warehouse (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.warehousesService.remove(id);
  }
}
