import { Pressable, Text, View } from "react-native";

// RN port of the web's shared half-hour slot helpers (day-slot-strip.tsx).
// Wall-clock ("floating time") convention: ISO strings end in Z but carry the
// selected local wall time; display ALWAYS slices the ISO — never Date/locale.

export const SLOT_MS = 30 * 60 * 1000;

/** `2026-07-15T09:30:00.000Z` → `2026-07-15 09:30` (wall clock, no TZ shift). */
export function fmtWall(iso: string | null | undefined, fallback: string): string {
  return iso ? iso.slice(0, 16).replace("T", " ") : fallback;
}

/** Slot index (0..47) → "HH:mm". */
export function slotToTime(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
}

/** "HH:mm" → slot index (floors to the half hour). */
export function timeToSlot(t: string): number {
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h)) return 0;
  return h * 2 + ((m ?? 0) >= 30 ? 1 : 0);
}

/** End time when a slot is picked as the LAST busy slot (exclusive end). */
export function slotEndTime(slot: number): string {
  return slot + 1 >= 48 ? "23:59" : slotToTime(slot + 1);
}

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
 * INDIVIDUALLY: green = free (tappable), red = taken (NOT tappable),
 * primary = selected. The same selection applies to every picked day, so
 * e.g. 09:00–12:00 can be reserved across three days at once; each
 * contiguous run per day becomes its own reservation range. Mirrors the web.
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
  onToggle?: (slot: number) => void;
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <View className="flex-row flex-wrap" style={{ margin: -2 }}>
        {Array.from({ length: 48 }, (_, i) => {
          const busy = isBusy(i);
          const isSel = selected.has(i);
          return (
            <View key={i} style={{ width: `${100 / 6}%`, padding: 2 }}>
              <Pressable
                disabled={busy}
                onPress={onToggle && !busy ? () => onToggle(i) : undefined}
                className={
                  isSel
                    ? "items-center rounded border border-primary bg-primary py-1"
                    : busy
                      ? "items-center rounded border border-destructive/60 bg-destructive/60 py-1"
                      : "items-center rounded border border-success/40 bg-success/15 py-1"
                }
              >
                <Text
                  className={
                    isSel
                      ? "font-mono text-[10px] text-primary-foreground"
                      : busy
                        ? "font-mono text-[10px] text-white"
                        : "font-mono text-[10px] text-foreground"
                  }
                >
                  {slotToTime(i)}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
