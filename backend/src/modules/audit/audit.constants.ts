/** CLS key under which the current actor is stored per request. */
export const AUDIT_ACTOR_KEY = 'auditActor';

export interface AuditActor {
  id: string;
  email: string;
}

/**
 * EVERY entity is audited (create/update/delete with full before/after) except
 * those listed here. Excluded:
 *  - AuditLog: would recurse infinitely.
 *  - LocationReading: high-volume 1-second sensor telemetry (millions of rows)
 *    — auditing it would explode the trail and add no business value.
 *  - RefreshToken / PasswordResetToken: auth secrets, rotated constantly; pure
 *    noise and sensitive.
 */
export const AUDIT_EXCLUDED_ENTITIES: ReadonlySet<string> = new Set([
  'AuditLog',
  'LocationReading',
  'RefreshToken',
  'PasswordResetToken',
  'Notification',
]);

/**
 * Keys stripped from before/after snapshots. Secrets must never land in the
 * audit trail; the change is still recorded via `changedColumns`.
 */
export const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'passwordHash',
  'password',
  'tokenHash',
]);
