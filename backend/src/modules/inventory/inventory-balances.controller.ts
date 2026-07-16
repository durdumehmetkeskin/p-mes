import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { WarehouseScoped } from '../auth/decorators/warehouse-scoped.decorator';
import type { User } from '../users/entities/user.entity';
import { ListInventoryBalancesQueryDto } from './dto/list-inventory-balances-query.dto';
import {
  BalanceSlot,
  InventoryBalancesService,
} from './inventory-balances.service';
import { WarehouseScopeService } from './warehouse-scope.service';

/**
 * Read-only on-hand view. Balances are no longer stored — each row is a
 * (lot, warehouse, rack) slot aggregated from `stock_items` (current / reserved
 * / available). Writes happen through stock items and movements.
 */
@ApiTags('inventory-balances')
@ApiBearerAuth('access-token')
@Controller('inventory-balances')
export class InventoryBalancesController {
  constructor(private readonly balancesService: InventoryBalancesService) {}

  @RequirePermissions('inventory-balances:read')
  @WarehouseScoped()
  @Get()
  @ApiOperation({
    summary:
      'List on-hand slots (computed from stock items; filter m/wh/loc/lot)',
  })
  async findAll(
    @Query() query: ListInventoryBalancesQueryDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BalanceSlot[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;

    const [items, total] = await this.balancesService.findPaginated({
      skip,
      take,
      materialId: query.materialId,
      warehouseId: query.warehouseId,
      rackId: query.rackId,
      lotId: query.lotId,
      scope: WarehouseScopeService.resolveScope(
        user,
        'inventory-balances:read',
      ),
    });

    res.setHeader('x-total-count', total);
    return items;
  }
}
