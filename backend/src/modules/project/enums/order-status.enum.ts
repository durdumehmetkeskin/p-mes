/**
 * Lifecycle status of an order — derived, never client-set: `pending` until
 * work starts on any of its processes, `in_progress` while any process is
 * past draft, `completed` once every process is completed.
 */
export enum OrderStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
}
