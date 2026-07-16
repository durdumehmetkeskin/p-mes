import { LotStatus } from './enums/lot-status.enum';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole days from today (UTC midnight) until the given date-only string.
 * Negative when the date is in the past. Returns null for a missing/invalid date.
 */
function daysUntil(dateOnly: string | null): number | null {
  if (!dateOnly) return null;
  const target = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.floor((target.getTime() - todayUtc) / MS_PER_DAY);
}

/**
 * Expiry-health for a lot, from its SKT and the material's week thresholds.
 * `daysLeft < 0` → expired; `< dangerWeeks·7` → danger; `< warningWeeks·7` →
 * warning; otherwise ok. No expiry, or neither threshold set → unknown.
 * Either threshold may be null (that band simply does not apply).
 */
export function computeLotExpiryStatus(
  expiryDate: string | null,
  dangerWeeks: number | null | undefined,
  warningWeeks: number | null | undefined,
): LotStatus {
  const daysLeft = daysUntil(expiryDate);
  if (daysLeft === null) return LotStatus.Unknown;
  if (daysLeft < 0) return LotStatus.Expired;

  const dangerDays =
    dangerWeeks != null && dangerWeeks >= 0 ? dangerWeeks * 7 : null;
  const warningDays =
    warningWeeks != null && warningWeeks >= 0 ? warningWeeks * 7 : null;

  if (dangerDays === null && warningDays === null) return LotStatus.Unknown;
  if (dangerDays !== null && daysLeft < dangerDays) return LotStatus.Danger;
  if (warningDays !== null && daysLeft < warningDays) return LotStatus.Warning;
  return LotStatus.Ok;
}
