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
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { WarehouseScoped } from '../auth/decorators/warehouse-scoped.decorator';
import type { User } from '../users/entities/user.entity';
import { AssignStockItemStageDto } from './dto/assign-stock-item-stage.dto';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { ListStockItemsQueryDto } from './dto/list-stock-items-query.dto';
import { ReceiveReturnDto } from './dto/receive-return.dto';
import { ReserveStockItemDto } from './dto/reserve-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { StockItem } from './entities/stock-item.entity';
import { StockItemsService } from './stock-items.service';
import { WarehouseScopeService } from './warehouse-scope.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof StockItem> = [
  'id',
  'quantity',
  'status',
  'createdAt',
  'updatedAt',
];

@ApiTags('stock-items')
@ApiBearerAuth('access-token')
@Controller('stock-items')
export class StockItemsController {
  constructor(private readonly stockItemsService: StockItemsService) {}

  @RequirePermissions('stock-items:read')
  @WarehouseScoped()
  @Get()
  @ApiOperation({
    summary:
      'List stock items (paginated, filter by lot/material/project/status)',
  })
  async findAll(
    @Query() query: ListStockItemsQueryDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StockItem[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof StockItem)
      ? (query._sort as keyof StockItem)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.stockItemsService.findPaginated({
      skip,
      take,
      sort,
      order,
      lotId: query.lotId,
      materialId: query.materialId,
      projectId: query.projectId,
      warehouseId: query.warehouseId,
      orderId: query.orderId,
      stageId: query.stageId,
      stageUnassigned: query.stageUnassigned,
      status: query.status,
      scope: WarehouseScopeService.resolveScope(user, 'stock-items:read'),
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('stock-items:read')
  @WarehouseScoped()
  @Get(':id')
  @ApiOperation({ summary: 'Get a stock item by id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.findOne(
      id,
      WarehouseScopeService.resolveScope(user, 'stock-items:read'),
    );
  }

  @RequirePermissions('stock-items:read')
  @WarehouseScoped()
  @Get(':id/qr')
  @ApiOperation({ summary: 'Generate a QR code (PNG) for a stock item' })
  async generateQr(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileName, buffer } = await this.stockItemsService.generateQr(
      id,
      WarehouseScopeService.resolveScope(user, 'stock-items:read'),
    );
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(
        fileName,
      )}`,
    });
    return new StreamableFile(buffer);
  }

  // Always created `available`; order/stage cannot be assigned at creation.
  @RequirePermissions('stock-items:create')
  @WarehouseScoped()
  @Post()
  @ApiOperation({ summary: 'Create an available stock item under a lot' })
  create(
    @Body() dto: CreateStockItemDto,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.create(
      dto,
      WarehouseScopeService.resolveScope(user, 'stock-items:create'),
    );
  }

  @RequirePermissions('stock-items:update')
  @WarehouseScoped()
  @Patch(':id')
  @ApiOperation({
    summary: 'Edit an available stock item (quantity / warehouse / rack / note)',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockItemDto,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.update(
      id,
      dto,
      WarehouseScopeService.resolveScope(user, 'stock-items:update'),
    );
  }

  @RequirePermissions('stock-items:create-reserve')
  @WarehouseScoped()
  @Post(':id/reserve')
  @ApiOperation({
    summary:
      'Reserve part of an available item for an order (+optional stage); splits off a reserved item',
  })
  reserve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReserveStockItemDto,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.reserve(
      id,
      dto,
      WarehouseScopeService.resolveScope(user, 'stock-items:create-reserve'),
      user.id,
    );
  }

  @RequirePermissions('stock-items:confirm-reserve')
  @WarehouseScoped()
  @Post(':id/confirm-reserve')
  @ApiOperation({
    summary: 'Confirm a reserving item as reserved (warehouse responsible)',
  })
  confirmReserve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.confirmReserve(
      id,
      WarehouseScopeService.resolveScope(user, 'stock-items:confirm-reserve'),
      user.id,
    );
  }

  @RequirePermissions('stock-items:deliver')
  @WarehouseScoped()
  @Post(':id/deliver')
  @ApiOperation({
    summary: 'Hand over a reserved item to a stage (warehouse; → delivering)',
  })
  deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.deliver(
      id,
      WarehouseScopeService.resolveScope(user, 'stock-items:deliver'),
      user.id,
    );
  }

  // No @RequirePermissions: the service authorizes the stage responsible (or an
  // admin), so a project member can receive by scanning without a stock key.
  @Post(':id/receive')
  @ApiOperation({
    summary: 'Receive a handed-over item (stage responsible; → delivered)',
  })
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.receive(id, user);
  }

  // No @RequirePermissions: the service authorizes the stage responsible (or an
  // admin) — the stage returns leftover material by scanning, no stock key.
  @Post(':id/return')
  @ApiOperation({
    summary:
      'Return leftover to the warehouse (stage responsible; → returning)',
  })
  returnToWarehouse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.returnToWarehouse(id, user);
  }

  // No @RequirePermissions: the service authorizes the stage/process
  // responsible (or an admin) — assigning the order's reserved pool onto a
  // stage is stage work, no stock key needed.
  @Post(':id/assign-stage')
  @ApiOperation({
    summary:
      "Assign (part of) an order-reserved item to one of the order's stages",
  })
  assignStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignStockItemStageDto,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.assignToStage(id, dto, user);
  }

  // Authorization in the service: stage/process responsible or admin.
  @Post(':id/unassign-stage')
  @ApiOperation({
    summary: "Return a stage-assigned reserved item to the order's pool",
  })
  unassignStage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.unassignFromStage(id, user);
  }

  @RequirePermissions('stock-items:receive-return')
  @WarehouseScoped()
  @Post(':id/receive-return')
  @ApiOperation({
    summary:
      'Re-receive a returned item: weigh (quantity) + shelve (rackId) → available',
  })
  receiveReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveReturnDto,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.receiveReturn(
      id,
      dto,
      WarehouseScopeService.resolveScope(user, 'stock-items:receive-return'),
      user.id,
    );
  }

  @RequirePermissions('stock-items:create-release')
  @WarehouseScoped()
  @Post(':id/release')
  @ApiOperation({ summary: 'Release a reserved item back to available' })
  release(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.release(
      id,
      WarehouseScopeService.resolveScope(user, 'stock-items:create-release'),
    );
  }

  @RequirePermissions('stock-items:create-consume')
  @WarehouseScoped()
  @Post(':id/consume')
  @ApiOperation({
    summary: 'Consume (issue) a stock item; records an OUT movement',
  })
  consume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<StockItem> {
    return this.stockItemsService.consume(
      id,
      WarehouseScopeService.resolveScope(user, 'stock-items:create-consume'),
      user,
    );
  }

  @RequirePermissions('stock-items:delete')
  @WarehouseScoped()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a wrong stock item' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.stockItemsService.remove(
      id,
      WarehouseScopeService.resolveScope(user, 'stock-items:delete'),
    );
  }
}
