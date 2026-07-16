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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { WarehouseScoped } from '../auth/decorators/warehouse-scoped.decorator';
import type { User } from '../users/entities/user.entity';
import { CreateLotDto } from './dto/create-lot.dto';
import { ListLotsQueryDto } from './dto/list-lots-query.dto';
import { UpdateLotDto } from './dto/update-lot.dto';
import { Lot } from './entities/lot.entity';
import { LotsService } from './lots.service';
import { WarehouseScopeService } from './warehouse-scope.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof Lot> = [
  'id',
  'lotNumber',
  'expiryDate',
  'status',
  'createdAt',
  'updatedAt',
];

@ApiTags('lots')
@ApiBearerAuth('access-token')
@Controller('lots')
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  // Reads available to holders of the permission and to warehouse responsibles
  // (scoped to lots stored in their warehouses).
  @RequirePermissions('lots:read')
  @WarehouseScoped()
  @Get()
  @ApiOperation({ summary: 'List lots (paginated, filter by material/status)' })
  async findAll(
    @Query() query: ListLotsQueryDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Lot[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof Lot)
      ? (query._sort as keyof Lot)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.lotsService.findPaginated({
      skip,
      take,
      sort,
      order,
      q: query.q,
      materialId: query.materialId,
      projectId: query.projectId,
      status: query.status,
      scope: WarehouseScopeService.resolveScope(user, 'lots:read'),
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('lots:read')
  @WarehouseScoped()
  @Get(':id')
  @ApiOperation({ summary: 'Get a lot by id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Lot> {
    return this.lotsService.findOne(
      id,
      WarehouseScopeService.resolveScope(user, 'lots:read'),
    );
  }

  // Writes require the admin role.
  @RequirePermissions('lots:create')
  @Post()
  @ApiOperation({ summary: 'Create a lot (admin only)' })
  create(@Body() dto: CreateLotDto): Promise<Lot> {
    return this.lotsService.create(dto);
  }

  @RequirePermissions('lots:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a lot (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLotDto,
  ): Promise<Lot> {
    return this.lotsService.update(id, dto);
  }

  @RequirePermissions('lots:delete')
  @WarehouseScoped()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lot' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.lotsService.remove(
      id,
      WarehouseScopeService.resolveScope(user, 'lots:delete'),
    );
  }
}
