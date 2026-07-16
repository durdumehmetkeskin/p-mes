// Formatting for process/stage timing. Duration is a manually entered value
// (hours); started/completed are recorded timestamps.

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

/** Hours → "2.5 h" / "3 h" / "—". */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null || hours <= 0) return "—";
  return `${parseFloat(Number(hours).toFixed(2))} h`;
}

/** "Started X · Completed Y · Duration Z" — duration from manual hours. */
export function timingLine(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  durationHours: number | null | undefined,
): string {
  const parts: string[] = [];
  if (startIso) parts.push(`Started ${formatDateTime(startIso)}`);
  if (endIso) parts.push(`Completed ${formatDateTime(endIso)}`);
  parts.push(`Duration ${formatHours(durationHours)}`);
  return parts.join(" · ");
}
