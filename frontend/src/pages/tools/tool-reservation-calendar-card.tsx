import { useApiUrl, useCustom } from "@refinedev/core";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SLOT_MS,
  slotLabel,
  slotToTime,
} from "@/pages/projects/workspace/day-slot-strip";

interface ToolReservationRow {
  id: string;
  status: "reserved" | "delivering" | "received" | "returning" | "returned";
  reservedFrom: string | null;
  reservedTo: string | null;
  stage: {
    id: string;
    name: string;
    status: string;
    estimatedStartDate: string | null;
    estimatedCompletedDate: string | null;
  } | null;
  order: { orderNumber: string } | null;
  project: { code: string; name: string } | null;
}

const ACTIVE = ["delivering", "received", "returning"];
const DAY = 86_400_000;

/** The reservation's [start, end] day strings (falls back to stage window). */
function dayRange(r: ToolReservationRow): [string, string] | null {
  const s = r.reservedFrom?.slice(0, 10) ?? r.stage?.estimatedStartDate;
  const e = r.reservedTo?.slice(0, 10) ?? r.stage?.estimatedCompletedDate;
  return s && e ? [s, e] : null;
}

/** Busy [from, to) wall-clock ms within the selected day (floating time). */
function busyRangeInDay(
  r: ToolReservationRow,
  dayStart: number,
): [number, number] | null {
  const from = r.reservedFrom
    ? Math.max(Date.parse(r.reservedFrom), dayStart)
    : dayStart;
  const to = r.reservedTo
    ? Math.min(Date.parse(r.reservedTo), dayStart + DAY)
    : dayStart + DAY;
  return to > from ? [from, to] : null;
}

/** Floating wall-clock ms → HH:mm ("24:00" at the day's end). */
function msToTime(ms: number, dayStart: number): string {
  if (ms >= dayStart + DAY) return "24:00";
  return new Date(ms).toISOString().slice(11, 16);
}

function usageLabel(r: ToolReservationRow): string {
  return [
    r.stage?.name,
    r.order?.orderNumber,
    r.project ? [r.project.code, r.project.name].filter(Boolean).join(" · ") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Day-by-day view of this tool's stage reservations (painted month calendar). */
export function ToolReservationCalendarCard({ tool }: { tool: { id: string } }) {
  const apiUrl = useApiUrl();
  const [selected, setSelected] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const { result } = useCustom<ToolReservationRow[]>({
    url: `${apiUrl}/tools/${tool.id}/reservations`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const rows = useMemo(
    () => (Array.isArray(result?.data) ? result.data : []),
    [result],
  );

  const { reserved, active, done, unscheduled, firstDay } = useMemo(() => {
    const reserved: Date[] = [];
    const active: Date[] = [];
    const done: Date[] = [];
    const unscheduled: ToolReservationRow[] = [];
    let first: Date | null = null;
    for (const r of rows) {
      const range = dayRange(r);
      if (!range) {
        unscheduled.push(r);
        continue;
      }
      let days: Date[] = [];
      try {
        days = eachDayOfInterval({
          start: parseISO(range[0]),
          end: parseISO(range[1]),
        });
      } catch {
        unscheduled.push(r);
        continue;
      }
      if (days[0] && (!first || days[0] < first)) first = days[0];
      const bucket =
        r.status === "reserved" ? reserved : ACTIVE.includes(r.status) ? active : done;
      bucket.push(...days);
    }
    return { reserved, active, done, unscheduled, firstDay: first };
  }, [rows]);

  // The selected day's reservations with their busy wall-clock windows, for
  // the half-hour occupancy grid.
  const selectedKey = format(selected, "yyyy-MM-dd");
  const dayStart = Date.parse(`${selectedKey}T00:00:00.000Z`);
  const dayEntries = useMemo(() => {
    const out: Array<{
      r: ToolReservationRow;
      from: number;
      to: number;
    }> = [];
    for (const r of rows) {
      const range = dayRange(r);
      if (!range || selectedKey < range[0] || selectedKey > range[1]) continue;
      const busy = busyRangeInDay(r, dayStart);
      if (busy) out.push({ r, from: busy[0], to: busy[1] });
    }
    return out.sort((a, b) => a.from - b.from);
  }, [rows, selectedKey, dayStart]);
  const busySlots = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < 48; i++) {
      const s = dayStart + i * SLOT_MS;
      if (dayEntries.some((e) => e.from < s + SLOT_MS && e.to > s)) set.add(i);
    }
    return set;
  }, [dayEntries, dayStart]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reservation calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This tool has no stage reservations.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-blue-200" /> Reserved
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-amber-300" /> In use
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-muted" /> Returned
              </span>
            </div>
            <div className="flex flex-col gap-4 lg:flex-row">
              <Calendar
                mode="single"
                required
                selected={selected}
                onSelect={(d) => d && setSelected(d)}
                defaultMonth={firstDay ?? undefined}
                modifiers={{ reserved, active, done }}
                modifiersClassNames={{
                  reserved: "bg-blue-200 text-blue-950",
                  active: "bg-amber-300 text-amber-950 font-semibold",
                  done: "bg-muted text-muted-foreground line-through",
                }}
                className="self-start rounded-md border"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-medium">
                  {format(selected, "dd.MM.yyyy")} —{" "}
                  {dayEntries.length
                    ? `${dayEntries.length} reservation${dayEntries.length === 1 ? "" : "s"}`
                    : "free all day"}
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {Array.from({ length: 48 }, (_, i) => {
                    const busy = busySlots.has(i);
                    const holders = busy
                      ? dayEntries
                          .filter(
                            (e) =>
                              e.from < dayStart + (i + 1) * SLOT_MS &&
                              e.to > dayStart + i * SLOT_MS,
                          )
                          .map((e) => usageLabel(e.r))
                          .join(" | ")
                      : "";
                    return (
                      <div
                        key={i}
                        title={`${slotLabel(i)} · ${busy ? holders : "free"}`}
                        className={`h-7 rounded border text-center font-mono text-[10px] leading-7 ${
                          busy
                            ? "border-red-500/60 bg-red-500/60 text-white"
                            : "border-green-500/40 bg-green-500/15 text-foreground"
                        }`}
                      >
                        {slotToTime(i)}
                      </div>
                    );
                  })}
                </div>
                {dayEntries.length > 0 && (
                  <div className="space-y-1">
                    {dayEntries.map((e) => (
                      <p
                        key={e.r.id}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <span className="font-mono text-foreground">
                          {msToTime(e.from, dayStart)}–{msToTime(e.to, dayStart)}
                        </span>
                        · {usageLabel(e.r)}
                        <StatusBadge label={e.r.status} />
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <ul className="space-y-1 text-sm">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {r.stage?.name ?? "—"}
                    {r.order ? ` · ${r.order.orderNumber}` : ""}
                    {r.stage?.estimatedStartDate && r.stage?.estimatedCompletedDate
                      ? ` · ${r.stage.estimatedStartDate} → ${r.stage.estimatedCompletedDate}`
                      : " · unscheduled"}
                  </span>
                  <StatusBadge label={r.status} />
                </li>
              ))}
            </ul>
            {unscheduled.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {unscheduled.length} reservation(s) have no estimated stage dates and
                aren't shown on the calendar.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
