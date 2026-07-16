/** Stock movement type. */
export enum InventoryTransactionType {
  In = 'in', // receipt into a target slot
  Out = 'out', // issue from a source slot
  Transfer = 'transfer', // single-record move (legacy)
  TransferOut = 'transfer_out', // debit leg of a transfer
  TransferIn = 'transfer_in', // credit leg of a transfer
  Adjustment = 'adjustment', // stock count correction (signed delta)
  Handover = 'handover', // warehouse→stage handover (audit: deliverer/receiver + dates)
  Return = 'return', // stage→warehouse return of leftover (re-received into a rack)
}
