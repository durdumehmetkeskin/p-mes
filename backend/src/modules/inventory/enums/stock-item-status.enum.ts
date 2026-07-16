/** Lifecycle status of a stock item under a lot. */
export enum StockItemStatus {
  // Free, on-hand stock — the pool a reservation draws from.
  Available = 'available',
  // Split off from Available and pending physical preparation by the warehouse
  // responsible; not freely available, but not yet confirmed reserved.
  Reserving = 'reserving',
  // Held for an order (and optionally a stage) — confirmed by the responsible.
  Reserved = 'reserved',
  // Handed over by the warehouse (scanned), pending receipt by the stage.
  Delivering = 'delivering',
  // Received by the stage responsible; with the stage, consumed later on use.
  Delivered = 'delivered',
  // Leftover handed back by the stage (scanned), pending warehouse re-receipt.
  Returning = 'returning',
  // Issued out of stock — no longer counted as on-hand.
  Consumed = 'consumed',
}
