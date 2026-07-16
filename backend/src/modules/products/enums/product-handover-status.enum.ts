/**
 * Material-style handover of a produced product into storage:
 * `produced` (just recorded) → `delivering` (the producer handed it over,
 * scanned via the product QR) → `received` (the warehouse responsible took
 * it in and shelved it).
 */
export enum ProductHandoverStatus {
  Produced = 'produced',
  Delivering = 'delivering',
  Received = 'received',
}
