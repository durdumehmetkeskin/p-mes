import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { WarehouseScopeService } from './warehouse-scope.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { IssueMaterialDto } from './dto/issue-material.dto';
import { ListInventoryTransactionsQueryDto } from './dto/list-inventory-transactions-query.dto';
import { ReceiveMaterialDto } from './dto/receive-material.dto';
import { TransferMaterialDto } from './dto/transfer-material.dto';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import {
  describeMovementEndpoints,
  MovementEndpoints,
} from './movement-endpoints.util';
import {
  AdjustmentResult,
  InventoryTransactionsService,
} from './inventory-transactions.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof InventoryTransaction> = [
  'id',
  'type',
  'quantity',
  'createdAt',
];

@ApiTags('inventory-transactions')
@ApiBearerAuth('access-token')
@Controller('inventory-transactions')
export class InventoryTransactionsController {
  constructor(
    private readonly transactionsService: InventoryTransactionsService,
  ) {}

  // Reads available to holders of the permission and to warehouse responsibles
  // (scoped to movements touching their warehouses).
  @RequirePermissions('inventory-transactions:read')
  @WarehouseScoped()
  @Get()
  @ApiOperation({
    summary:
      'List stock movements (paginated, filter by type/material/warehouse)',
  })
  async findAll(
    @Query() query: ListInventoryTransactionsQueryDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<(InventoryTransaction & MovementEndpoints)[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(
      query._sort as keyof InventoryTransaction,
    )
      ? (query._sort as keyof InventoryTransaction)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.transactionsService.findPaginated({
      skip,
      take,
      sort,
      order,
      type: query.type,
      materialId: query.materialId,
      warehouseId: query.warehouseId,
      scope: WarehouseScopeService.resolveScope(
        user,
        'inventory-transactions:read',
      ),
    });

    res.setHeader('x-total-count', total);
    // Enrich each row with a human From→To (warehouse / user / external).
    return items.map((it) => ({ ...it, ...describeMovementEndpoints(it) }));
  }

  @RequirePermissions('inventory-transactions:read')
  @WarehouseScoped()
  @Get(':id')
  @ApiOperation({ summary: 'Get a stock movement by id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<InventoryTransaction> {
    return this.transactionsService.findOne(
      id,
      WarehouseScopeService.resolveScope(user, 'inventory-transactions:read'),
    );
  }

  // Recording a movement is admin-only; movements are immutable (no edit/delete).
  @RequirePermissions('inventory-transactions:create')
  @Post()
  @ApiOperation({
    summary:
      'Record a stock movement; adjusts balances atomically (admin only)',
  })
  create(
    @Body() dto: CreateInventoryTransactionDto,
  ): Promise<InventoryTransaction> {
    return this.transactionsService.create(dto);
  }

  @RequirePermissions('inventory-transactions:create-receive')
  @WarehouseScoped()
  @Post('receive')
  @ApiOperation({
    summary:
      'Receive material into a slot (IN movement + balance upsert, one transaction)',
  })
  receive(
    @Body() dto: ReceiveMaterialDto,
    @CurrentUser() user: User,
  ): Promise<InventoryTransaction> {
    return this.transactionsService.receive(
      dto,
      WarehouseScopeService.resolveScope(
        user,
        'inventory-transactions:create-receive',
      ),
    );
  }

  @RequirePermissions('inventory-transactions:create-issue')
  @WarehouseScoped()
  @Post('issue')
  @ApiOperation({
    summary:
      'Issue material from a slot (OUT movement + balance debit, one transaction; rejects insufficient stock)',
  })
  issue(
    @Body() dto: IssueMaterialDto,
    @CurrentUser() user: User,
  ): Promise<InventoryTransaction> {
    return this.transactionsService.issue(
      dto,
      WarehouseScopeService.resolveScope(
        user,
        'inventory-transactions:create-issue',
      ),
    );
  }

  @RequirePermissions('inventory-transactions:create-transfer')
  @WarehouseScoped()
  @Post('transfer')
  @ApiOperation({
    summary:
      'Transfer material between slots (TRANSFER_OUT + TRANSFER_IN + both balances, one transaction)',
  })
  transfer(
    @Body() dto: TransferMaterialDto,
    @CurrentUser() user: User,
  ): Promise<{
    transferOut: InventoryTransaction;
    transferIn: InventoryTransaction;
  }> {
    return this.transactionsService.transfer(
      dto,
      WarehouseScopeService.resolveScope(
        user,
        'inventory-transactions:create-transfer',
      ),
    );
  }

  @RequirePermissions('inventory-transactions:create-adjust')
  @WarehouseScoped()
  @Post('adjust')
  @ApiOperation({
    summary:
      'Stock count: compare counted vs system qty; on a difference, record an ADJUSTMENT movement and correct the balance (one transaction)',
  })
  adjust(
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: User,
  ): Promise<AdjustmentResult> {
    return this.transactionsService.adjust(
      dto,
      WarehouseScopeService.resolveScope(
        user,
        'inventory-transactions:create-adjust',
      ),
    );
  }

  // "Delete a wrong record": movements are immutable, so reversal posts the
  // compensating movement(s) instead. Scoped to movements touching the user's
  // warehouses.
  @RequirePermissions('inventory-transactions:create-reverse')
  @WarehouseScoped()
  @Post(':id/reverse')
  @ApiOperation({
    summary:
      'Reverse a movement by posting the inverse movement(s); the original is preserved',
  })
  reverse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<InventoryTransaction[]> {
    return this.transactionsService.reverse(
      id,
      WarehouseScopeService.resolveScope(
        user,
        'inventory-transactions:create-reverse',
      ),
    );
  }
}
