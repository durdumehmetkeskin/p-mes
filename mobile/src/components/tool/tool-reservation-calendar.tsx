import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useApiUrl, useCustom } from "@refinedev/core";
import { Calendar } from "react-native-calendars";

import { SectionLabel } from "@/components/refine-ui/field-row";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { colors } from "@/lib/theme";

interface Row {
  id: string;
  status: "reserved" | "delivering" | "received" | "returning" | "returned";
  reservedFrom: string | null;
  reservedTo: string | null;
  stage: {
    name: string;
    estimatedStartDate: string | null;
    estimatedCompletedDate: string | null;
  } | null;
  order: { orderNumber: string } | null;
  project: { code?: string; name?: string } | null;
}

const DAY_MS = 86_400_000;
const SLOT_MS = 30 * 60 * 1000; // half-hour granularity

const slotToTime = (slot: number): string => {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
};

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const e = new Date(`${end}T00:00:00`);
  for (
    let d = new Date(`${start}T00:00:00`), i = 0;
    d <= e && i < 366;
    d.setDate(d.getDate() + 1), i++
  ) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return out;
}

const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** The reservation's [start, end] day strings (falls back to stage window). */
function dayRange(r: Row): [string, string] | null {
  const s = r.reservedFrom?.slice(0, 10) ?? r.stage?.estimatedStartDate;
  const e = r.reservedTo?.slice(0, 10) ?? r.stage?.estimatedCompletedDate;
  return s && e ? [s, e] : null;
}

/** Busy [from, to) wall-clock ms within the selected day (floating time). */
function busyRangeInDay(r: Row, dayStart: number): [number, number] | null {
  const from = r.reservedFrom
    ? Math.max(Date.parse(r.reservedFrom), dayStart)
    : dayStart;
  const to = r.reservedTo
    ? Math.min(Date.parse(r.reservedTo), dayStart + DAY_MS)
    : dayStart + DAY_MS;
  return to > from ? [from, to] : null;
}

/** Floating wall-clock ms → HH:mm ("24:00" at the day's end). */
function msToTime(ms: number, dayStart: number): string {
  if (ms >= dayStart + DAY_MS) return "24:00";
  return new Date(ms).toISOString().slice(11, 16);
}

function usageLabel(r: Row): string {
  return [
    r.stage?.name,
    r.order?.orderNumber,
    r.project
      ? [r.project.code, r.project.name].filter(Boolean).join(" · ")
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

const calTheme = {
  backgroundColor: colors.card,
  calendarBackground: colors.card,
  dayTextColor: colors.foreground,
  monthTextColor: colors.foreground,
  textDisabledColor: colors.mutedForeground,
  todayTextColor: colors.primary,
  arrowColor: colors.primary,
  textSectionTitleColor: colors.mutedForeground,
} as const;

const STATUS_COLOR: Record<string, string> = {
  reserved: "#3b82f6",
  delivering: "#f59e0b",
  received: "#f59e0b",
  returning: "#f59e0b",
  returned: colors.mutedForeground,
};

/** Day-by-day view of the tool's stage reservations (painted month calendar). */
export function ToolReservationCalendar({ toolId }: { toolId: string }) {
  const apiUrl = useApiUrl();
  const [selected, setSelected] = useState<string>(todayKey);
  const { result } = useCustom<Row[]>({
    url: `${apiUrl}/tools/${toolId}/reservations`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const rows = useMemo(
    () => (Array.isArray(result?.data) ? result.data : []),
    [result],
  );

  const marked = useMemo(() => {
    const m: Record<string, object> = {};
    for (const r of rows) {
      const range = dayRange(r);
      if (!range) continue;
      const color = STATUS_COLOR[r.status] ?? colors.mutedForeground;
      const days = eachDay(range[0], range[1]);
      days.forEach((d, i) => {
        m[d] = {
          color,
          textColor: "#ffffff",
          startingDay: i === 0,
          endingDay: i === days.length - 1,
        };
      });
    }
    return m;
  }, [rows]);

  // The selected day's reservations with their busy wall-clock windows, for
  // the half-hour occupancy grid.
  const dayStart = Date.parse(`${selected}T00:00:00.000Z`);
  const dayEntries = useMemo(() => {
    const out: Array<{ r: Row; from: number; to: number }> = [];
    for (const r of rows) {
      const range = dayRange(r);
      if (!range || selected < range[0] || selected > range[1]) continue;
      const busy = busyRangeInDay(r, dayStart);
      if (busy) out.push({ r, from: busy[0], to: busy[1] });
    }
    return out.sort((a, b) => a.from - b.from);
  }, [rows, selected, dayStart]);
  const isBusy = (slot: number) => {
    const s = dayStart + slot * SLOT_MS;
    return dayEntries.some((e) => e.from < s + SLOT_MS && e.to > s);
  };

  return (
    <View className="rounded-lg border border-border bg-card p-4">
      <SectionLabel>Reservation calendar</SectionLabel>
      {rows.length === 0 ? (
        <Text className="mt-2 text-xs text-muted-foreground">
          No stage reservations for this tool.
        </Text>
      ) : (
        <View className="mt-2 gap-2">
          <Calendar
            markingType="period"
            markedDates={marked}
            onDayPress={(d) => setSelected(d.dateString)}
            theme={calTheme}
            style={{ borderRadius: 8 }}
          />
          <Text className="font-sans-semibold text-sm text-foreground">
            {selected} —{" "}
            {dayEntries.length
              ? `${dayEntries.length} reservation${dayEntries.length === 1 ? "" : "s"}`
              : "free all day"}
          </Text>
          <View className="gap-1">
            {Array.from({ length: 6 }, (_, row) => (
              <View key={row} className="flex-row gap-1">
                {Array.from({ length: 8 }, (_, col) => {
                  const i = row * 8 + col;
                  const busy = isBusy(i);
                  return (
                    <View
                      key={i}
                      className="flex-1 items-center rounded border py-1"
                      style={{
                        backgroundColor: busy
                          ? "rgba(239,68,68,0.6)"
                          : "rgba(34,197,94,0.15)",
                        borderColor: busy
                          ? "rgba(239,68,68,0.6)"
                          : "rgba(34,197,94,0.4)",
                      }}
                    >
                      <Text
                        className="font-mono text-[10px]"
                        style={{ color: busy ? "#ffffff" : colors.foreground }}
                      >
                        {slotToTime(i)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          {dayEntries.map((e) => (
            <View
              key={e.r.id}
              className="flex-row items-center justify-between gap-2"
            >
              <Text className="flex-1 pr-2 text-xs text-muted-foreground">
                <Text className="font-mono text-foreground">
                  {msToTime(e.from, dayStart)}–{msToTime(e.to, dayStart)}
                </Text>{" "}
                · {usageLabel(e.r)}
              </Text>
              <StatusBadge label={e.r.status} />
            </View>
          ))}
          <View className="gap-1">
            {rows.map((r) => (
              <View
                key={r.id}
                className="flex-row items-center justify-between gap-2"
              >
                <Text className="flex-1 pr-2 text-sm text-foreground">
                  {r.stage?.name ?? "—"}
                  {r.order ? ` · ${r.order.orderNumber}` : ""}
                  {dayRange(r) ? "" : " · unscheduled"}
                </Text>
                <StatusBadge label={r.status} />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
