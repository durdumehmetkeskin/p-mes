/**
 * Handover lifecycle of a tool reserved for a process stage — mirrors the
 * stock-item handover: reserved → (crib) delivering → (stage) received →
 * (stage, after completion) returning → (crib) returned.
 */
export enum ToolReservationStatus {
  Reserved = 'reserved',
  Delivering = 'delivering',
  Received = 'received',
  Returning = 'returning',
  Returned = 'returned',
}
