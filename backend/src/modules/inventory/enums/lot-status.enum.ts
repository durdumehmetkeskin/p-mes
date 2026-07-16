/**
 * Expiry-health of a material lot/batch, derived from its SKT (expiryDate) vs
 * the material's dangerWeeks/warningWeeks thresholds. Auto-managed (set on write
 * + refreshed daily) — never client-set.
 */
export enum LotStatus {
  // No expiryDate, or the material has no thresholds set — nothing to judge.
  Unknown = 'unknown',
  // Expiry is comfortably far off (>= warningWeeks). Green.
  Ok = 'ok',
  // Getting close (< warningWeeks). Yellow.
  Warning = 'warning',
  // Very close (< dangerWeeks). Red.
  Danger = 'danger',
  // Past its SKT. Red.
  Expired = 'expired',
}
