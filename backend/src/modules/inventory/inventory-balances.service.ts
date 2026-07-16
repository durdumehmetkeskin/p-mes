import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import type { Lot } from './entities/lot.entity';
import type { Material } from './entities/material.entity';
import type { Rack } from './entities/rack.entity';
import { StockItem } from './entities/stock-item.entity';
import type { Warehouse } from './entities/warehouse.entity';
import { StockItemStatus } from './enums/stock-item-status.enum';
import { resolveWarehouseIds, WarehouseScope } from './warehouse-scope.service';

/**
 * A computed on-hand slot — one per (lot, warehouse, rack). There is no stored
 * balances table anymore; these are aggregated from `stock_items` so the
 * existing read UIs (Stock on Hand, material detail, My Warehouse, project
 * inventory) keep working unchanged.
 */
export interface BalanceSlot {
  id: string;
  materialId: string;
  material: Material | null;
  warehouseId: string;
  warehouse: Warehouse;
  rackId: string | null;
  rack: Rack | null;
  lotId: string | null;
  lot: Lot | null;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  quantity: number; // legacy alias for currentStock
}

@Injectable()
export class InventoryBalancesService {
  constructor(
    @InjectRepository(StockItem)
    private readonly stockItems: Repository<StockItem>,
  ) {}

  async findPaginated(options: {
    skip?: number;
    take?: number;
    materialId?: string;
    warehouseId?: string;
    rackId?: string;
    lotId?: string;
    scope?: WarehouseScope;
  }): Promise<[BalanceSlot[], number]> {
    const warehouseIds = resolveWarehouseIds(
      options.scope ?? 'ALL',
      options.warehouseId,
    );

    const where: FindOptionsWhere<StockItem> = {
      // Consumed items are no longer on hand; reserving/delivering/delivered are
      // committed-but-on-hand.
      status: In([
        StockItemStatus.Available,
        StockItemStatus.Reserving,
        StockItemStatus.Reserved,
        StockItemStatus.Delivering,
        StockItemStatus.Delivered,
        StockItemStatus.Returning,
      ]),
    };
    if (options.lotId) where.lotId = options.lotId;
    if (options.rackId) where.rackId = options.rackId;
    if (warehouseIds !== undefined) where.warehouseId = In(warehouseIds);
    if (options.materialId) where.lot = { materialId: options.materialId };

    const items = await this.stockItems.find({
      where,
      // Only the relations the slot aggregation needs — not the full eager tree
      // (which cartesian-explodes via project.managerUser → user.roles etc.).
      relations: {
        lot: { material: { materialUnit: true } },
        warehouse: true,
        rack: true,
      },
      loadEagerRelations: false,
      order: { createdAt: 'ASC' },
    });

    const slots = this.aggregate(items);
    const total = slots.length;
    const start = options.skip ?? 0;
    const end = options.take !== undefined ? start + options.take : undefined;
    return [slots.slice(start, end), total];
  }

  /** Group stock items into (lot, warehouse, rack) slots with status sums. */
  private aggregate(items: StockItem[]): BalanceSlot[] {
    const map = new Map<string, BalanceSlot>();
    for (const it of items) {
      const key = `${it.lotId ?? ''}:${it.warehouseId}:${it.rackId ?? ''}`;
      let slot = map.get(key);
      if (!slot) {
        slot = {
          id: key,
          materialId: it.lot?.materialId ?? '',
          material: it.lot?.material ?? null,
          warehouseId: it.warehouseId,
          warehouse: it.warehouse,
          rackId: it.rackId,
          rack: it.rack,
          lotId: it.lotId,
          lot: it.lot ?? null,
          currentStock: 0,
          reservedStock: 0,
          availableStock: 0,
          quantity: 0,
        };
        map.set(key, slot);
      }
      // Everything committed (reserving/reserved/delivering/delivered) counts as
      // reserved; only `available` is freely available.
      if (it.status === StockItemStatus.Available) {
        slot.availableStock += it.quantity;
      } else {
        slot.reservedStock += it.quantity;
      }
      slot.currentStock = slot.availableStock + slot.reservedStock;
      slot.quantity = slot.currentStock;
    }
    return [...map.values()];
  }
}
