import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SLOT_MS,
  slotLabel,
  slotToTime,
} from "@/pages/projects/workspace/day-slot-strip";

export interface ScheduleStage {
  id: string;
  name: string;
  sequence: number;
  status: string;
  orderItemName: string | null;
  workerNames: string | null;
  start: string | null;
  end: string | null;
  estimatedDurationHours: number | null;
  durationHours: number | null;
}
export interface ScheduleReservation {
  id: string;
  startDate: string;
  endDate: string;
  startAt: string | null;
  endAt: string | null;
  stageId: string | null;
  note: string | null;
  orderId: string;
  orderNumber: string;
  orderName: string | null;
  orderStatus: string | null;
  projectId: string | null;
  projectName: string | null;
  stages: ScheduleStage[];
  /** Absent in the section-scoped feed (the caller injects its section). */
  section?: { id: string; code: string; name: string } | null;
}
/** reserved = booked but not started, active = running now, completed = done. */
type Bucket = "reserved" | "active" | "completed";

const BUCKET_META: Record<
  Bucket,
  { label: string; tone: "warning" | "info" | "success"; dot: string }
> = {
  reserved: { label: "Reserved", tone: "warning", dot: "bg-amber-500" },
  active: { label: "In progress", tone: "info", dot: "bg-blue-500" },
  completed: { label: "Completed", tone: "success", dot: "bg-emerald-500" },
};

const DAY = 86_400_000;

/** Classify by the linked stage's status, falling back to the order status. */
function bucketOf(r: ScheduleReservation): Bucket {
  const status = r.stageId
    ? r.stages.find((s) => s.id === r.stageId)?.status
    : r.orderStatus;
  if (status === "completed") return "completed";
  if (status === "in_progress") return "active";
  return "reserved";
}

/** Every yyyy-MM-dd the reservation covers (inclusive, capped at a year). */
function daysOf(r: ScheduleReservation): string[] {
  const out: string[] = [];
  const start = parseISO(`${r.startDate}T00:00:00`).getTime();
  const end = parseISO(`${r.endDate}T00:00:00`).getTime();
  for (let t = start, i = 0; t <= end && i < 366; t += DAY, i++) {
    out.push(format(new Date(t), "yyyy-MM-dd"));
  }
  return out;
}

/** Wall-clock display — never toLocaleString (it would shift the hours). */
const fmtWall = (iso: string | null): string | null =>
  iso ? iso.slice(0, 16).replace("T", " ") : null;

export interface SectionRow {
  id: string;
  code: string;
  name: string;
}

/** One reservation's busy window inside the selected day. */
interface DayEntry {
  from: number;
  to: number;
  reservation: ScheduleReservation;
}

/** Busy [from, to) wall-clock ms within the selected day (floating time). */
function busyRangeInDay(
  r: ScheduleReservation,
  dayStart: number,
): [number, number] | null {
  const from = r.startAt
    ? Math.max(Date.parse(r.startAt), dayStart)
    : dayStart;
  const to = r.endAt
    ? Math.min(Date.parse(r.endAt), dayStart + DAY)
    : dayStart + DAY;
  return to > from ? [from, to] : null;
}

/** "project · order (name) · order item · seq. stage" attribution line. */
function usageLabel(r: ScheduleReservation): string {
  const stage = r.stageId
    ? r.stages.find((s) => s.id === r.stageId)
    : undefined;
  const parts = [
    r.projectName,
    `${r.orderNumber}${r.orderName ? ` (${r.orderName})` : ""}`,
    stage?.orderItemName,
    stage ? `${stage.sequence}. ${stage.name}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

/** Floating wall-clock ms → HH:mm ("24:00" at the day's end). */
function msToTime(ms: number, dayStart: number): string {
  if (ms >= dayStart + DAY) return "24:00";
  return new Date(ms).toISOString().slice(11, 16);
}

/**
 * The selected day's 48 half-hour cells as a labeled grid (red = busy,
 * green = free), followed by who uses each busy window.
 */
function SectionDayGrid({
  dayStart,
  entries,
}: {
  dayStart: number;
  entries: DayEntry[];
}) {
  const busyOf = (slot: number) => {
    const s = dayStart + slot * SLOT_MS;
    return entries.filter((e) => e.from < s + SLOT_MS && e.to > s);
  };
  const sorted = [...entries].sort((a, b) => a.from - b.from);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: 48 }, (_, i) => {
          const busy = busyOf(i);
          return (
            <div
              key={i}
              title={`${slotLabel(i)} · ${
                busy.length
                  ? busy.map((e) => usageLabel(e.reservation)).join(" | ")
                  : "free"
              }`}
              className={`h-7 rounded border text-center font-mono text-[10px] leading-7 ${
                busy.length
                  ? "border-red-500/60 bg-red-500/60 text-white"
                  : "border-green-500/40 bg-green-500/15 text-foreground"
              }`}
            >
              {slotToTime(i)}
            </div>
          );
        })}
      </div>
      {sorted.length ? (
        <div className="space-y-1">
          {sorted.map((e) => {
            const stage = e.reservation.stageId
              ? e.reservation.stages.find(
                  (s) => s.id === e.reservation.stageId,
                )
              : undefined;
            return (
              <p
                key={e.reservation.id}
                className="text-xs text-muted-foreground"
              >
                <span className="font-mono text-foreground">
                  {msToTime(e.from, dayStart)}–{msToTime(e.to, dayStart)}
                </span>{" "}
                · {usageLabel(e.reservation)}
                {stage?.workerNames ? ` · 👥 ${stage.workerNames}` : ""}
              </p>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Free all day</p>
      )}
    </div>
  );
}

/** Pure month-calendar + selected-day hour-grid view, fed with data. */
export function WorkCalendarView({
  reservations,
  sections,
}: {
  reservations: ScheduleReservation[];
  sections: SectionRow[];
}) {
  const [selected, setSelected] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  // Per-day buckets so the calendar can color days and the detail list can
  // show what happens on the selected one.
  const byDay = useMemo(() => {
    const map = new Map<
      string,
      Array<{ reservation: ScheduleReservation; bucket: Bucket }>
    >();
    for (const r of reservations) {
      const bucket = bucketOf(r);
      for (const day of daysOf(r)) {
        let list = map.get(day);
        if (!list) {
          list = [];
          map.set(day, list);
        }
        list.push({ reservation: r, bucket });
      }
    }
    return map;
  }, [reservations]);

  const dayModifiers = useMemo(() => {
    const days: Record<Bucket, Date[]> = {
      reserved: [],
      active: [],
      completed: [],
    };
    for (const [day, items] of byDay) {
      // One color per day — running work wins over holds, holds over done.
      const bucket: Bucket = items.some((i) => i.bucket === "active")
        ? "active"
        : items.some((i) => i.bucket === "reserved")
          ? "reserved"
          : "completed";
      days[bucket].push(parseISO(`${day}T00:00:00`));
    }
    return days;
  }, [byDay]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedItems = byDay.get(selectedKey) ?? [];

  // Per-section busy wall-clock ranges of the selected day, so every section
  // of the location gets an hour strip (even the fully free ones).
  const dayStart = Date.parse(`${selectedKey}T00:00:00.000Z`);
  const busyBySection = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const { reservation: r } of selectedItems) {
      if (!r.section) continue;
      const range = busyRangeInDay(r, dayStart);
      if (!range) continue;
      const list = map.get(r.section.id) ?? [];
      list.push({ from: range[0], to: range[1], reservation: r });
      map.set(r.section.id, list);
    }
    return map;
  }, [selectedItems, dayStart]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Work calendar</span>
          <span className="flex flex-wrap items-center gap-3 text-xs font-normal text-muted-foreground">
            {(Object.keys(BUCKET_META) as Bucket[]).map((b) => (
              <span key={b} className="flex items-center gap-1">
                <span
                  className={`inline-block h-3 w-3 rounded ${BUCKET_META[b].dot}`}
                />
                {BUCKET_META[b].label}
              </span>
            ))}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 lg:flex-row">
            <Calendar
              mode="single"
              required
              selected={selected}
              onSelect={(d) => d && setSelected(d)}
              modifiers={dayModifiers}
              modifiersClassNames={{
                reserved: "bg-amber-500/60 text-white",
                active: "bg-blue-500/60 text-white",
                completed: "bg-emerald-500/60 text-white",
              }}
              className="self-start rounded-md border"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium">
                {format(selected, "dd.MM.yyyy")} —{" "}
                {selectedItems.length
                  ? `${selectedItems.length} reservation${selectedItems.length === 1 ? "" : "s"}`
                  : "no work scheduled"}
              </p>
              {sections.length > 0 && (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">
                      Hourly occupancy by section
                    </span>
                    <span>00:00 — 24:00 (30 min)</span>
                  </div>
                  {sections.map((s) => (
                    <div key={s.id} className="space-y-1">
                      <p className="text-xs font-medium">
                        {s.code} · {s.name}
                      </p>
                      <SectionDayGrid
                        dayStart={dayStart}
                        entries={busyBySection.get(s.id) ?? []}
                      />
                    </div>
                  ))}
                </div>
              )}
              {selectedItems.map(({ reservation: r, bucket }) => {
                const stage = r.stageId
                  ? r.stages.find((s) => s.id === r.stageId)
                  : undefined;
                const start = fmtWall(r.startAt);
                const end = fmtWall(r.endAt);
                return (
                  <div
                    key={r.id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {r.section
                          ? `${r.section.code} · ${r.section.name}`
                          : "—"}
                      </span>
                      <StatusBadge
                        tone={BUCKET_META[bucket].tone}
                        label={BUCKET_META[bucket].label}
                      />
                    </div>
                    <p className="text-muted-foreground">
                      {r.orderNumber}
                      {r.orderName ? ` (${r.orderName})` : ""}
                      {r.projectName ? ` · ${r.projectName}` : ""}
                    </p>
                    {stage && (
                      <p className="text-muted-foreground">
                        Stage {stage.sequence}. {stage.name}
                        {stage.workerNames ? ` · 👥 ${stage.workerNames}` : ""}
                        {stage.durationHours != null
                          ? ` · ${stage.durationHours}h actual`
                          : stage.estimatedDurationHours != null
                            ? ` · ${stage.estimatedDurationHours}h est.`
                            : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {start && end
                        ? `${start} → ${end}`
                        : `${r.startDate} → ${r.endDate}`}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
      </CardContent>
    </Card>
  );
}

