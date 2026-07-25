/** How a custody lifecycle ended. */
export enum CustodyCloseAction {
  /** Leftover handed back and accepted (warehouse/crib re-received it). */
  Returned = 'returned',
  /** Fully used up at the stage (explicit consume, or the consuming stage completed). */
  Consumed = 'consumed',
  /** The link was undone (stage/order deleted, reservation removed, input released). */
  Released = 'released',
}
