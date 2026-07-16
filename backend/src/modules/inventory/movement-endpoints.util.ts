import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { InventoryTransactionType } from './enums/inventory-transaction-type.enum';

/** What a movement endpoint represents, so the UI can pick an icon. */
export type EndpointKind = 'warehouse' | 'user' | 'external' | 'none';

export interface MovementEndpoints {
  from: string;
  fromKind: EndpointKind;
  to: string;
  toKind: EndpointKind;
}

function slotLabel(
  wh: { code?: string } | null | undefined,
  rack: { code?: string } | null | undefined,
): string | null {
  if (!wh && !rack) return null;
  return [wh?.code, rack?.code].filter(Boolean).join(' / ') || null;
}

/**
 * Human "From → To" for a stock movement, richer than the raw source/target
 * slots: handovers read warehouse→user, returns read user→warehouse, transfers
 * warehouse→warehouse, receipts external→warehouse, issues warehouse→used.
 * `deliveredByUser`/`receivedByUser` must be loaded for handover/return rows.
 */
export function describeMovementEndpoints(
  tx: InventoryTransaction,
): MovementEndpoints {
  const src = slotLabel(tx.sourceWarehouse, tx.sourceRack);
  const tgt = slotLabel(tx.targetWarehouse, tx.targetRack);
  const deliveredBy = tx.deliveredByUser?.name ?? null;
  const receivedBy = tx.receivedByUser?.name ?? null;
  const wh = (v: string | null): [string, EndpointKind] =>
    v ? [v, 'warehouse'] : ['—', 'none'];
  const user = (v: string | null, fallback: string): [string, EndpointKind] => [
    v ?? fallback,
    'user',
  ];

  let from: [string, EndpointKind];
  let to: [string, EndpointKind];

  switch (tx.type) {
    case InventoryTransactionType.In:
      from = ['External', 'external'];
      to = wh(tgt);
      break;
    case InventoryTransactionType.Out:
      from = wh(src);
      to = ['Consumed', 'none'];
      break;
    case InventoryTransactionType.Transfer:
    case InventoryTransactionType.TransferOut:
    case InventoryTransactionType.TransferIn:
      from = wh(src);
      to = wh(tgt);
      break;
    case InventoryTransactionType.Adjustment:
      // A signed correction at one slot: credit → target, debit → source.
      from = tgt ? ['Adjustment', 'external'] : wh(src);
      to = tgt ? wh(tgt) : ['Adjustment', 'external'];
      break;
    case InventoryTransactionType.Handover:
      // Warehouse hands prepared stock to the stage responsible (a person).
      from = wh(src);
      to = user(receivedBy, 'Stage');
      break;
    case InventoryTransactionType.Return:
      // Stage responsible (a person) returns leftover back to the warehouse.
      from = user(deliveredBy, 'Stage');
      to = wh(tgt);
      break;
    default:
      from = wh(src);
      to = wh(tgt);
  }

  return { from: from[0], fromKind: from[1], to: to[0], toKind: to[1] };
}
