/**
 * Shared half-hour availability strip + wall-clock helpers, used by both the
 * section and the tool reservation panels (identical look & behavior).
 * All times are "floating" wall clock — display via iso.slice, never
 * toLocaleString (it would shift the hours).
 */

export const SLOT_MS = 30 * 60 * 1000; // half-hour granularity

export const fmtWall = (iso: string | null, fallback: string): string =>
  iso ? iso.slice(0, 16).replace("T", " ") : fallback;

export const slotToTime = (slot: number): string => {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
};
export const slotLabel = (slot: number): string =>
  `${slotToTime(slot)}–${slot + 1 >= 48 ? "24:00" : slotToTime(slot + 1)}`;
export const timeToSlot = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 2 + (m >= 30 ? 1 : 0);
};
export const slotEndTime = (slot: number): string =>
  slot + 1 >= 48 ? "23:59" : slotToTime(slot + 1);

/** Group a sorted set of slot indexes into contiguous [from, toExclusive) runs. */
export function slotRuns(slots: Set<number>): Array<[number, number]> {
  const sorted = [...slots].sort((a, b) => a - b);
  const runs: Array<[number, number]> = [];
  for (const s of sorted) {
    const last = runs[runs.length - 1];
    if (last && last[1] === s) last[1] = s + 1;
    else runs.push([s, s + 1]);
  }
  return runs;
}

/**
 * 48 half-hour boxes, each labeled with its start time and toggled
 * INDIVIDUALLY: green = free (clickable), red = taken (NOT clickable),
 * primary = selected. The same selection applies to every selected day, so
 * e.g. 09:00–12:00 can be reserved across three days at once; each
 * contiguous run per day becomes its own reservation range.
 */
export function DaySlotStrip({
  label,
  isBusy,
  selected,
  onToggle,
}: {
  label: string;
  isBusy: (slot: number) => boolean;
  /** Individually selected slot indexes. */
  selected: ReadonlySet<number>;
  onToggle: (slot: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span>00:00 — 24:00 (30 dk)</span>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: 48 }, (_, i) => {
          const busy = isBusy(i);
          const isSel = selected.has(i);
          return (
            <button
              key={i}
              type="button"
              disabled={busy}
              title={`${slotLabel(i)}${busy ? " · dolu (alınamaz)" : " · boş"}`}
              onClick={busy ? undefined : () => onToggle(i)}
              className={`h-7 rounded border text-center font-mono text-[10px] leading-7 transition-colors ${
                isSel
                  ? "border-primary bg-primary text-primary-foreground"
                  : busy
                    ? "cursor-not-allowed border-red-500/60 bg-red-500/60 text-white"
                    : "border-green-500/40 bg-green-500/15 text-foreground hover:bg-green-500/40"
              }`}
            >
              {slotToTime(i)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
