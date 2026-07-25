import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { CustodyRecord } from './entities/custody-record.entity';
import { CustodyCloseAction } from './enums/custody-close-action.enum';
import { CustodyItemType } from './enums/custody-item-type.enum';

export interface OpenCustodyInput {
  itemType: CustodyItemType;
  sourceId: string;
  userId: string;
  stageId?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  lotNumber?: string | null;
  unit?: string | null;
  quantity?: number | null;
  orderNumber?: string | null;
  stageName?: string | null;
  warehouseCode?: string | null;
  receivedAt?: Date | null;
}

/**
 * The custody ledger writer/reader. Every mutator takes an optional
 * EntityManager so callers already inside a transaction keep the ledger write
 * atomic with the state flip; outside a transaction the repository manager is
 * used. All mutators are IDEMPOTENT no-ops when there is nothing to do —
 * `close()` in particular is also reached from flows where the item was never
 * in personal custody (e.g. plain goods-issue consume).
 */
@Injectable()
export class CustodyService {
  constructor(
    @InjectRepository(CustodyRecord)
    private readonly repo: Repository<CustodyRecord>,
  ) {}

  private mgr(manager?: EntityManager): EntityManager {
    return manager ?? this.repo.manager;
  }

  private findOpen(
    itemType: CustodyItemType,
    sourceId: string,
    manager?: EntityManager,
  ): Promise<CustodyRecord | null> {
    return this.mgr(manager).findOne(CustodyRecord, {
      where: { itemType, sourceId, closedAt: IsNull() },
      loadEagerRelations: false,
    });
  }

  /** Open a custody record (skips when an open one already exists). */
  async open(input: OpenCustodyInput, manager?: EntityManager): Promise<void> {
    const existing = await this.findOpen(
      input.itemType,
      input.sourceId,
      manager,
    );
    if (existing) return;
    const m = this.mgr(manager);
    await m.save(
      m.create(CustodyRecord, {
        itemType: input.itemType,
        sourceId: input.sourceId,
        userId: input.userId,
        stageId: input.stageId ?? null,
        itemCode: input.itemCode ?? '—',
        itemName: input.itemName ?? '—',
        lotNumber: input.lotNumber ?? null,
        unit: input.unit ?? null,
        quantity: input.quantity ?? null,
        orderNumber: input.orderNumber ?? null,
        stageName: input.stageName ?? null,
        warehouseCode: input.warehouseCode ?? null,
        receivedAt: input.receivedAt ?? new Date(),
      }),
    );
  }

  /** Stamp the "return started" moment on the open record (no-op if none). */
  async markReturning(
    itemType: CustodyItemType,
    sourceId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const open = await this.findOpen(itemType, sourceId, manager);
    if (!open) return;
    open.returningAt = new Date();
    await this.mgr(manager).save(open);
  }

  /** Close the open record (no-op when the item was never in custody). */
  async close(
    itemType: CustodyItemType,
    sourceId: string,
    opts: {
      action: CustodyCloseAction;
      returnedQuantity?: number | null;
      usedQuantity?: number | null;
    },
    manager?: EntityManager,
  ): Promise<void> {
    const open = await this.findOpen(itemType, sourceId, manager);
    if (!open) return;
    open.closedAt = new Date();
    open.closeAction = opts.action;
    if (opts.returnedQuantity !== undefined) {
      open.returnedQuantity = opts.returnedQuantity;
    }
    if (opts.usedQuantity !== undefined) {
      open.usedQuantity = opts.usedQuantity;
    }
    await this.mgr(manager).save(open);
  }

  /**
   * Close every open record bound to a stage (stage delete → released; stage
   * completion → the product inputs are used up).
   */
  async closeAllForStage(
    stageId: string,
    action: CustodyCloseAction,
    manager?: EntityManager,
    itemTypes?: CustodyItemType[],
  ): Promise<void> {
    const m = this.mgr(manager);
    const open = await m.find(CustodyRecord, {
      where: {
        stageId,
        closedAt: IsNull(),
        ...(itemTypes ? { itemType: In(itemTypes) } : {}),
      },
      loadEagerRelations: false,
    });
    if (open.length === 0) return;
    const now = new Date();
    for (const rec of open) {
      rec.closedAt = now;
      rec.closeAction = action;
      if (action === CustodyCloseAction.Consumed && rec.quantity != null) {
        rec.usedQuantity = rec.quantity;
      }
    }
    await m.save(open);
  }

  /** The user's CLOSED records, newest first (the history feed). */
  listHistory(userId: string, limit = 100): Promise<CustodyRecord[]> {
    return this.repo
      .createQueryBuilder('c')
      .where('c.user_id = :userId', { userId })
      .andWhere('c.closed_at IS NOT NULL')
      .orderBy('c.closed_at', 'DESC')
      .take(limit)
      .getMany();
  }

  /** The user's OPEN records (currently held), newest first. */
  listOpen(userId: string): Promise<CustodyRecord[]> {
    return this.repo.find({
      where: { userId, closedAt: IsNull() },
      loadEagerRelations: false,
      order: { receivedAt: 'DESC' },
    });
  }
}
