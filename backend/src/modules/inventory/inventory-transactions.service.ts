import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { IssueMaterialDto } from './dto/issue-material.dto';
import { ReceiveMaterialDto } from './dto/receive-material.dto';
import { TransferMaterialDto } from './dto/transfer-material.dto';

export interface AdjustmentResult {
  systemQuantity: number;
  countedQuantity: number;
  delta: number;
  adjusted: boolean;
  movement: InventoryTransaction | null;
}
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { StockItem } from './entities/stock-item.entity';
import { InventoryTransactionType } from './enums/inventory-transaction-type.enum';
import { StockItemStatus } from './enums/stock-item-status.enum';
import { InventoryTransactionsRepository } from './inventory-transactions.repository';
import { assertProjectPlacement } from './placement.util';
import { RacksService } from './racks.service';
import { LotsService } from './lots.service';
import { MaterialsService } from './materials.service';
import { StockAlertService } from './stock-alert.service';
import {
  resolveWarehouseIds,
  WarehouseScope,
  WarehouseScopeService,
} from './warehouse-scope.service';
import { WarehousesService } from './warehouses.service';

interface Slot {
  warehouseId?: string;
  rackId?: string;
  lotId?: string;
}

@Injectable()
export class InventoryTransactionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly transactionsRepository: InventoryTransactionsRepository,
    private readonly materialsService: MaterialsService,
    private readonly warehousesService: WarehousesService,
    private readonly racksService: RacksService,
    private readonly lotsService: LotsService,
    private readonly stockAlert: StockAlertService,
  ) {}

  async create(
    dto: CreateInventoryTransactionDto,
  ): Promise<InventoryTransaction> {
    const needsSource =
      dto.type === InventoryTransactionType.Out ||
      dto.type === InventoryTransactionType.Transfer;
    const needsTarget =
      dto.type === InventoryTransactionType.In ||
      dto.type === InventoryTransactionType.Transfer;

    // --- validation (read-only, outside the write transaction) ---
    const material = await this.materialsService.findOne(dto.materialId);

    if (needsSource && !dto.sourceWarehouseId) {
      throw new BadRequestException(
        'sourceWarehouseId is required for OUT/TRANSFER',
      );
    }
    if (needsTarget && !dto.targetWarehouseId) {
      throw new BadRequestException(
        'targetWarehouseId is required for IN/TRANSFER',
      );
    }
    if (!needsSource && this.hasSlot('source', dto)) {
      throw new BadRequestException('An IN transaction must not have a source');
    }
    if (!needsTarget && this.hasSlot('target', dto)) {
      throw new BadRequestException(
        'An OUT transaction must not have a target',
      );
    }

    await this.validateSlotRefs(dto);
    // Placement rule applies to the credited (target) slot.
    if (needsTarget) {
      await this.assertTargetPlacement(dto.targetLotId, dto.targetRackId);
    }

    const source: Slot = {
      warehouseId: dto.sourceWarehouseId,
      rackId: dto.sourceRackId,
      lotId: dto.sourceLotId,
    };
    const target: Slot = {
      warehouseId: dto.targetWarehouseId,
      rackId: dto.targetRackId,
      lotId: dto.targetLotId,
    };

    if (
      dto.type === InventoryTransactionType.Transfer &&
      this.sameSlot(source, target)
    ) {
      throw new BadRequestException(
        'Transfer source and target must be different',
      );
    }

    // --- atomic stock adjustment + movement record ---
    const id = await this.dataSource.transaction(async (manager) => {
      if (needsSource) {
        const item = await this.getOrCreateAvailableStockItem(manager, source);
        if (item.quantity < dto.quantity) {
          throw new BadRequestException(
            `Insufficient stock for material ${material.code}: available ${item.quantity} ${material.materialUnit?.name ?? ''}, requested ${dto.quantity} ${material.materialUnit?.name ?? ''}`,
          );
        }
        item.quantity = item.quantity - dto.quantity;
        await manager.save(item);
      }

      if (needsTarget) {
        const item = await this.getOrCreateAvailableStockItem(manager, target);
        item.quantity = item.quantity + dto.quantity;
        await manager.save(item);
      }

      const tx = manager.create(InventoryTransaction, {
        type: dto.type,
        materialId: dto.materialId,
        quantity: dto.quantity,
        note: dto.note ?? null,
        sourceWarehouseId: dto.sourceWarehouseId ?? null,
        sourceRackId: dto.sourceRackId ?? null,
        sourceLotId: dto.sourceLotId ?? null,
        targetWarehouseId: dto.targetWarehouseId ?? null,
        targetRackId: dto.targetRackId ?? null,
        targetLotId: dto.targetLotId ?? null,
      });
      const saved = await manager.save(tx);
      return saved.id;
    });

    // After the movement commits, alert admins if the material is now low.
    await this.stockAlert.check(dto.materialId);
    return this.findOne(id);
  }

  /**
   * Goods receipt — a dedicated IN movement. Reuses create() so the stock
   * movement + balance upsert happen in one transaction.
   */
  receive(
    dto: ReceiveMaterialDto,
    scope: WarehouseScope = 'ALL',
  ): Promise<InventoryTransaction> {
    WarehouseScopeService.assertInScope(scope, dto.warehouseId);
    return this.create({
      type: InventoryTransactionType.In,
      materialId: dto.materialId,
      quantity: dto.quantity,
      note: dto.note,
      targetWarehouseId: dto.warehouseId,
      targetRackId: dto.rackId,
      targetLotId: dto.lotId,
    });
  }

  /**
   * Material issue (e.g. to production) — a dedicated OUT movement. Reuses
   * create() so the stock check, balance debit and movement record happen in
   * one transaction; insufficient stock is rejected (no negative balance).
   */
  issue(
    dto: IssueMaterialDto,
    scope: WarehouseScope = 'ALL',
  ): Promise<InventoryTransaction> {
    WarehouseScopeService.assertInScope(scope, dto.warehouseId);
    return this.create({
      type: InventoryTransactionType.Out,
      materialId: dto.materialId,
      quantity: dto.quantity,
      note: dto.note,
      sourceWarehouseId: dto.warehouseId,
      sourceRackId: dto.rackId,
      sourceLotId: dto.lotId,
    });
  }

  /**
   * Transfer stock from a source slot to a target slot. In a single
   * transaction: debit source, credit target, and record two linked movements
   * (TRANSFER_OUT + TRANSFER_IN sharing a transferGroupId). Rejects
   * insufficient stock (no negative balance).
   */
  async transfer(
    dto: TransferMaterialDto,
    scope: WarehouseScope = 'ALL',
  ): Promise<{
    transferOut: InventoryTransaction;
    transferIn: InventoryTransaction;
  }> {
    // A responsible transfers OUT of their own warehouse; the target may be any
    // warehouse (transfer-out to another location).
    WarehouseScopeService.assertInScope(scope, dto.sourceWarehouseId);
    const material = await this.materialsService.findOne(dto.materialId);

    const source: Slot = {
      warehouseId: dto.sourceWarehouseId,
      rackId: dto.sourceRackId,
      lotId: dto.sourceLotId,
    };
    const target: Slot = {
      warehouseId: dto.targetWarehouseId,
      rackId: dto.targetRackId,
      lotId: dto.targetLotId,
    };

    await this.validateSlotRefs({
      sourceWarehouseId: dto.sourceWarehouseId,
      sourceRackId: dto.sourceRackId,
      sourceLotId: dto.sourceLotId,
      targetWarehouseId: dto.targetWarehouseId,
      targetRackId: dto.targetRackId,
      targetLotId: dto.targetLotId,
    } as CreateInventoryTransactionDto);
    await this.assertTargetPlacement(dto.targetLotId, dto.targetRackId);

    if (this.sameSlot(source, target)) {
      throw new BadRequestException(
        'Transfer source and target must be different',
      );
    }

    const groupId = randomUUID();

    const ids = await this.dataSource.transaction(async (manager) => {
      // 1. debit source
      const srcItem = await this.getOrCreateAvailableStockItem(manager, source);
      if (srcItem.quantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for material ${material.code}: available ${srcItem.quantity} ${material.materialUnit?.name ?? ''}, requested ${dto.quantity} ${material.materialUnit?.name ?? ''}`,
        );
      }
      srcItem.quantity = srcItem.quantity - dto.quantity;
      await manager.save(srcItem);

      // 2. credit target
      const tgtItem = await this.getOrCreateAvailableStockItem(manager, target);
      tgtItem.quantity = tgtItem.quantity + dto.quantity;
      await manager.save(tgtItem);

      // 3. TRANSFER_OUT movement (source leg)
      const out = manager.create(InventoryTransaction, {
        type: InventoryTransactionType.TransferOut,
        materialId: dto.materialId,
        quantity: dto.quantity,
        note: dto.note ?? null,
        transferGroupId: groupId,
        sourceWarehouseId: dto.sourceWarehouseId,
        sourceRackId: dto.sourceRackId ?? null,
        sourceLotId: dto.sourceLotId ?? null,
      });
      const savedOut = await manager.save(out);

      // 4. TRANSFER_IN movement (target leg)
      const inTx = manager.create(InventoryTransaction, {
        type: InventoryTransactionType.TransferIn,
        materialId: dto.materialId,
        quantity: dto.quantity,
        note: dto.note ?? null,
        transferGroupId: groupId,
        targetWarehouseId: dto.targetWarehouseId,
        targetRackId: dto.targetRackId ?? null,
        targetLotId: dto.targetLotId ?? null,
      });
      const savedIn = await manager.save(inTx);

      return { outId: savedOut.id, inId: savedIn.id };
    });

    return {
      transferOut: await this.findOne(ids.outId),
      transferIn: await this.findOne(ids.inId),
    };
  }

  /**
   * Stock count / adjustment. Compares the counted quantity to the system
   * balance; if they differ, corrects the balance and records a single
   * ADJUSTMENT movement (signed delta) in one transaction.
   */
  async adjust(
    dto: AdjustStockDto,
    scope: WarehouseScope = 'ALL',
  ): Promise<AdjustmentResult> {
    WarehouseScopeService.assertInScope(scope, dto.warehouseId);
    await this.materialsService.findOne(dto.materialId);
    await this.warehousesService.findOne(dto.warehouseId);
    if (dto.rackId) await this.racksService.findOne(dto.rackId);
    if (dto.lotId) await this.lotsService.findOne(dto.lotId);
    await this.assertTargetPlacement(dto.lotId, dto.rackId);

    const slot: Slot = {
      warehouseId: dto.warehouseId,
      rackId: dto.rackId,
      lotId: dto.lotId,
    };

    const result = await this.dataSource.transaction(async (manager) => {
      const item = await this.getOrCreateAvailableStockItem(manager, slot);
      const systemQuantity = item.quantity;
      const delta = dto.countedQuantity - systemQuantity;

      if (delta === 0) {
        return { systemQuantity, delta, movementId: null as string | null };
      }

      // Correct the available stock to the counted value.
      item.quantity = dto.countedQuantity;
      await manager.save(item);

      // Record the signed adjustment against the counted slot (target).
      const movement = manager.create(InventoryTransaction, {
        type: InventoryTransactionType.Adjustment,
        materialId: dto.materialId,
        quantity: delta,
        note: dto.note ?? null,
        targetWarehouseId: dto.warehouseId,
        targetRackId: dto.rackId ?? null,
        targetLotId: dto.lotId ?? null,
      });
      const saved = await manager.save(movement);
      return { systemQuantity, delta, movementId: saved.id };
    });

    await this.stockAlert.check(dto.materialId);
    return {
      systemQuantity: result.systemQuantity,
      countedQuantity: dto.countedQuantity,
      delta: result.delta,
      adjusted: result.movementId !== null,
      movement: result.movementId
        ? await this.findOne(result.movementId)
        : null,
    };
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof InventoryTransaction;
    order: 'ASC' | 'DESC';
    type?: InventoryTransactionType;
    materialId?: string;
    warehouseId?: string;
    scope?: WarehouseScope;
  }): Promise<[InventoryTransaction[], number]> {
    const warehouseIds = resolveWarehouseIds(
      options.scope ?? 'ALL',
      options.warehouseId,
    );
    return this.transactionsRepository.findAndCount({
      ...options,
      warehouseIds,
    });
  }

  async findOne(
    id: string,
    scope: WarehouseScope = 'ALL',
  ): Promise<InventoryTransaction> {
    const tx = await this.transactionsRepository.findById(id);
    if (!tx) {
      throw new NotFoundException(`Inventory transaction ${id} not found`);
    }
    this.assertTxInScope(scope, tx);
    return tx;
  }

  /**
   * Reverse a wrong movement by posting the compensating movement(s). The
   * original is never mutated/deleted (movements are append-only) — this is the
   * "delete a wrong record" action for the immutable ledger.
   */
  async reverse(
    id: string,
    scope: WarehouseScope = 'ALL',
    note?: string,
  ): Promise<InventoryTransaction[]> {
    const original = await this.transactionsRepository.findById(id);
    if (!original) {
      throw new NotFoundException(`Inventory transaction ${id} not found`);
    }
    this.assertTxInScope(scope, original);

    const reversalNote = note ?? `Reversal of movement ${original.id}`;
    // Internal compensating movements are posted with full ('ALL') scope — the
    // scope check already happened against the original above.
    switch (original.type) {
      case InventoryTransactionType.In: {
        // Received into the target slot → debit it back out.
        const tx = await this.create({
          type: InventoryTransactionType.Out,
          materialId: original.materialId,
          quantity: original.quantity,
          note: reversalNote,
          sourceWarehouseId: original.targetWarehouseId ?? undefined,
          sourceRackId: original.targetRackId ?? undefined,
          sourceLotId: original.targetLotId ?? undefined,
        });
        return [tx];
      }
      case InventoryTransactionType.Out: {
        // Issued from the source slot → credit it back in.
        const tx = await this.create({
          type: InventoryTransactionType.In,
          materialId: original.materialId,
          quantity: original.quantity,
          note: reversalNote,
          targetWarehouseId: original.sourceWarehouseId ?? undefined,
          targetRackId: original.sourceRackId ?? undefined,
          targetLotId: original.sourceLotId ?? undefined,
        });
        return [tx];
      }
      case InventoryTransactionType.Transfer:
      case InventoryTransactionType.TransferOut:
      case InventoryTransactionType.TransferIn: {
        return this.reverseTransfer(original, reversalNote);
      }
      case InventoryTransactionType.Adjustment: {
        const tx = await this.reverseAdjustment(original, reversalNote);
        return [tx];
      }
      default:
        throw new BadRequestException(
          `Cannot reverse a movement of type ${original.type}`,
        );
    }
  }

  /** Reverse a transfer (either leg or the legacy single record). */
  private async reverseTransfer(
    original: InventoryTransaction,
    note: string,
  ): Promise<InventoryTransaction[]> {
    // Reconstruct the source and target slots of the whole transfer.
    let src: Slot;
    let tgt: Slot;
    if (original.type === InventoryTransactionType.Transfer) {
      src = {
        warehouseId: original.sourceWarehouseId ?? undefined,
        rackId: original.sourceRackId ?? undefined,
        lotId: original.sourceLotId ?? undefined,
      };
      tgt = {
        warehouseId: original.targetWarehouseId ?? undefined,
        rackId: original.targetRackId ?? undefined,
        lotId: original.targetLotId ?? undefined,
      };
    } else {
      // A transfer leg only carries its own side; load the pair via the group.
      const legs = original.transferGroupId
        ? await this.transactionsRepository.findByGroup(
            original.transferGroupId,
          )
        : [original];
      const outLeg = legs.find(
        (l) => l.type === InventoryTransactionType.TransferOut,
      );
      const inLeg = legs.find(
        (l) => l.type === InventoryTransactionType.TransferIn,
      );
      if (!outLeg || !inLeg) {
        throw new BadRequestException(
          'Cannot reverse: incomplete transfer group',
        );
      }
      src = {
        warehouseId: outLeg.sourceWarehouseId ?? undefined,
        rackId: outLeg.sourceRackId ?? undefined,
        lotId: outLeg.sourceLotId ?? undefined,
      };
      tgt = {
        warehouseId: inLeg.targetWarehouseId ?? undefined,
        rackId: inLeg.targetRackId ?? undefined,
        lotId: inLeg.targetLotId ?? undefined,
      };
    }

    // Move the stock back: original target -> original source.
    const { transferOut, transferIn } = await this.transfer({
      materialId: original.materialId,
      quantity: original.quantity,
      note,
      sourceWarehouseId: tgt.warehouseId as string,
      sourceRackId: tgt.rackId,
      sourceLotId: tgt.lotId as string,
      targetWarehouseId: src.warehouseId as string,
      targetRackId: src.rackId,
      targetLotId: src.lotId as string,
    });
    return [transferOut, transferIn];
  }

  /** Reverse an adjustment by applying the opposite signed delta at its slot. */
  private async reverseAdjustment(
    original: InventoryTransaction,
    note: string,
  ): Promise<InventoryTransaction> {
    const slot: Slot = {
      warehouseId: original.targetWarehouseId ?? undefined,
      rackId: original.targetRackId ?? undefined,
      lotId: original.targetLotId ?? undefined,
    };
    const delta = -original.quantity;

    const movementId = await this.dataSource.transaction(async (manager) => {
      const item = await this.getOrCreateAvailableStockItem(manager, slot);
      const next = item.quantity + delta;
      if (next < 0) {
        throw new BadRequestException(
          'Cannot reverse adjustment: resulting stock would be negative',
        );
      }
      item.quantity = next;
      await manager.save(item);

      const movement = manager.create(InventoryTransaction, {
        type: InventoryTransactionType.Adjustment,
        materialId: original.materialId,
        quantity: delta,
        note,
        targetWarehouseId: original.targetWarehouseId,
        targetRackId: original.targetRackId,
        targetLotId: original.targetLotId,
      });
      const saved = await manager.save(movement);
      return saved.id;
    });

    await this.stockAlert.check(original.materialId);
    return this.findOne(movementId);
  }

  /** A movement is in scope when its source or target warehouse is. */
  private assertTxInScope(
    scope: WarehouseScope,
    tx: InventoryTransaction,
  ): void {
    if (scope === 'ALL') return;
    const inScope =
      (tx.sourceWarehouseId && scope.includes(tx.sourceWarehouseId)) ||
      (tx.targetWarehouseId && scope.includes(tx.targetWarehouseId));
    if (!inScope) {
      throw new NotFoundException(`Inventory transaction ${tx.id} not found`);
    }
  }

  /**
   * Find or build (qty 0) the single AVAILABLE stock item for a slot,
   * in-transaction. Stock always lives under a lot, so a lotId is required.
   */
  private async getOrCreateAvailableStockItem(
    manager: EntityManager,
    slot: Slot,
  ): Promise<StockItem> {
    if (!slot.warehouseId) {
      throw new BadRequestException(
        'warehouseId is required for stock movements',
      );
    }
    if (!slot.lotId) {
      throw new BadRequestException('lotId is required for stock movements');
    }
    const repo = manager.getRepository(StockItem);
    const existing = await repo.findOne({
      where: {
        lotId: slot.lotId,
        warehouseId: slot.warehouseId,
        rackId: slot.rackId ?? IsNull(),
        status: StockItemStatus.Available,
      },
      loadEagerRelations: false,
    });
    if (existing) return existing;

    return repo.create({
      lotId: slot.lotId,
      warehouseId: slot.warehouseId,
      rackId: slot.rackId ?? null,
      quantity: 0,
      status: StockItemStatus.Available,
    });
  }

  private hasSlot(
    side: 'source' | 'target',
    dto: CreateInventoryTransactionDto,
  ): boolean {
    return side === 'source'
      ? Boolean(dto.sourceWarehouseId || dto.sourceRackId || dto.sourceLotId)
      : Boolean(dto.targetWarehouseId || dto.targetRackId || dto.targetLotId);
  }

  private sameSlot(a: Slot, b: Slot): boolean {
    return (
      (a.warehouseId ?? null) === (b.warehouseId ?? null) &&
      (a.rackId ?? null) === (b.rackId ?? null) &&
      (a.lotId ?? null) === (b.lotId ?? null)
    );
  }

  /**
   * Enforce the project-placement rule on a credited (target) slot: a lot with a
   * project may only be credited into a rack whose zone belongs to that project.
   */
  private async assertTargetPlacement(
    lotId?: string,
    rackId?: string,
  ): Promise<void> {
    if (!lotId) return;
    const lot = await this.lotsService.findOne(lotId);
    if (!lot.projectId) return;
    const rack = rackId ? await this.racksService.findOne(rackId) : null;
    assertProjectPlacement(lot, rack);
  }

  private async validateSlotRefs(
    dto: CreateInventoryTransactionDto,
  ): Promise<void> {
    const warehouseIds = [dto.sourceWarehouseId, dto.targetWarehouseId];
    const binIds = [dto.sourceRackId, dto.targetRackId];
    const lotIds = [dto.sourceLotId, dto.targetLotId];

    for (const id of warehouseIds) {
      if (id) await this.warehousesService.findOne(id);
    }
    for (const id of binIds) {
      if (id) await this.racksService.findOne(id);
    }
    for (const id of lotIds) {
      if (id) await this.lotsService.findOne(id);
    }
  }
}
