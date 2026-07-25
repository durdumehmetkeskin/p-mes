import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useApiUrl, useCustom } from "@refinedev/core";
import { Calendar } from "react-native-calendars";
import {
  CalendarClock,
  CalendarOff,
  GanttChartSquare,
  Percent,
} from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";

import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { KpiCard } from "@/components/refine-ui/kpi-card";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/lib/theme";

interface ScheduleStage {
  id: string;
  name: string;
  status: string;
}
interface ScheduleReservation {
  id: string;
  startDate: string;
  endDate: string;
  startAt: string | null;
  endAt: string | null;
  stageId: string | null;
  orderNumber: string;
  orderStatus: string | null;
  projectName: string | null;
  stages: ScheduleStage[];
}
interface SectionSchedule {
  section: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    locationCode: string | null;
    locationName: string | null;
  };
  reservations: ScheduleReservation[];
}

const DAY_MS = 86_400_000;
const SLOT_MS = 30 * 60 * 1000;

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

/** reserved = booked, active = running, completed = done (web bucket rule). */
type Bucket = "reserved" | "active" | "completed";
const BUCKET_COLOR: Record<Bucket, string> = {
  reserved: "#f59e0b",
  active: "#3b82f6",
  completed: "#22c55e",
};
const BUCKET_LABEL: Record<Bucket, string> = {
  reserved: "reserved",
  active: "in progress",
  completed: "completed",
};

/** Classify by the linked stage's status, falling back to the order status. */
function bucketOf(r: ScheduleReservation): Bucket {
  const status = r.stageId
    ? r.stages.find((s) => s.id === r.stageId)?.status
    : r.orderStatus;
  if (status === "completed") return "completed";
  if (status === "in_progress") return "active";
  return "reserved";
}

/** Busy [from, to) wall-clock ms within the selected day (floating time). */
function busyRangeInDay(
  r: ScheduleReservation,
  dayStart: number,
): [number, number] | null {
  const from = r.startAt
    ? Math.max(Date.parse(r.startAt), dayStart)
    : Math.max(Date.parse(`${r.startDate}T00:00:00.000Z`), dayStart);
  const to = r.endAt
    ? Math.min(Date.parse(r.endAt), dayStart + DAY_MS)
    : Math.min(
        Date.parse(`${r.endDate}T00:00:00.000Z`) + DAY_MS,
        dayStart + DAY_MS,
      );
  return to > from ? [from, to] : null;
}

/** Floating wall-clock ms → HH:mm ("24:00" at the day's end). */
function msToTime(ms: number, dayStart: number): string {
  if (ms >= dayStart + DAY_MS) return "24:00";
  return new Date(ms).toISOString().slice(11, 16);
}

/** Merge possibly-overlapping [start, end) intervals (web parity). */
function mergeIntervals(
  spans: Array<[number, number]>,
): Array<[number, number]> {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
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

/**
 * Section detail (mobile port of the web SectionShow): overview + utilization
 * KPIs + the work calendar — days colored by the linked stage's status; pick
 * a day to see its half-hour occupancy grid and which order/project/stage
 * holds each busy window.
 */
export default function SectionDetailScreen() {
  const { sectionId } = useLocalSearchParams<{
    id: string;
    sectionId: string;
  }>();
  const apiUrl = useApiUrl();
  const [selected, setSelected] = useState<string>(todayKey);

  const { result, query } = useCustom<SectionSchedule>({
    url: `${apiUrl}/sections/${sectionId}/schedule`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const section = result?.data?.section;
  const reservations = useMemo(
    () => result?.data?.reservations ?? [],
    [result],
  );

  // Busy/free arithmetic over the data domain (web parity, day-granular).
  const { busyDays, windowDays, utilization } = useMemo(() => {
    const spans = mergeIntervals(
      reservations.map((r) => [
        Date.parse(`${r.startDate}T00:00:00.000Z`),
        Date.parse(`${r.endDate}T00:00:00.000Z`) + DAY_MS,
      ]),
    );
    if (spans.length === 0)
      return { busyDays: 0, windowDays: 1, utilization: 0 };
    const lo = Math.min(...spans.map(([s]) => s));
    const hi = Math.max(...spans.map(([, e]) => e));
    const busyMs = spans.reduce((acc, [s, e]) => acc + (e - s), 0);
    const busy = Math.round(busyMs / DAY_MS);
    const win = Math.max(1, Math.round((hi - lo) / DAY_MS));
    return {
      busyDays: busy,
      windowDays: win,
      utilization: Math.round((busy / win) * 100),
    };
  }, [reservations]);

  const marked = useMemo(() => {
    const m: Record<string, object> = {};
    for (const r of reservations) {
      const color = BUCKET_COLOR[bucketOf(r)];
      const days = eachDay(r.startDate, r.endDate);
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
  }, [reservations]);

  // The selected day's reservations with their busy wall-clock windows.
  const dayStart = Date.parse(`${selected}T00:00:00.000Z`);
  const dayEntries = useMemo(() => {
    const out: Array<{ r: ScheduleReservation; from: number; to: number }> = [];
    for (const r of reservations) {
      if (selected < r.startDate || selected > r.endDate) continue;
      const busy = busyRangeInDay(r, dayStart);
      if (busy) out.push({ r, from: busy[0], to: busy[1] });
    }
    return out.sort((a, b) => a.from - b.from);
  }, [reservations, selected, dayStart]);
  const isBusy = (slot: number) => {
    const s = dayStart + slot * SLOT_MS;
    return dayEntries.some((e) => e.from < s + SLOT_MS && e.to > s);
  };

  const entryLabel = (r: ScheduleReservation): string =>
    [
      r.orderNumber,
      r.projectName,
      r.stageId ? r.stages.find((s) => s.id === r.stageId)?.name : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <Screen
      title={section ? `${section.code} · ${section.name}` : "Section"}
      subtitle={
        section
          ? [section.locationCode, section.locationName]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
      canGoBack
    >
      {query.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </View>
      ) : !section ? (
        <View className="p-6">
          <Text className="text-sm text-muted-foreground">
            Could not load the section schedule (needs Section Reservations:
            Read).
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
        >
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Overview</SectionLabel>
              <StatusBadge
                label={section.isActive ? "active" : "inactive"}
              />
            </View>
            <FieldRow label="Code" value={section.code} mono />
            {section.description ? (
              <FieldRow label="Description" value={section.description} />
            ) : null}
          </View>

          <View className="flex-row gap-3">
            <KpiCard
              className="flex-1"
              label="Reservations"
              value={String(reservations.length)}
              icon={GanttChartSquare}
            />
            <KpiCard
              className="flex-1"
              label="Busy days"
              value={String(busyDays)}
              icon={CalendarClock}
              hint={`of ${windowDays} in window`}
              tone="warning"
            />
          </View>
          <View className="flex-row gap-3">
            <KpiCard
              className="flex-1"
              label="Free days"
              value={String(Math.max(0, windowDays - busyDays))}
              icon={CalendarOff}
              tone="success"
            />
            <KpiCard
              className="flex-1"
              label="Utilization"
              value={`${utilization}%`}
              icon={Percent}
              progress={utilization}
              tone="info"
            />
          </View>

          <View className="rounded-lg border border-border bg-card p-4">
            <SectionLabel>Work calendar</SectionLabel>
            {reservations.length === 0 ? (
              <Text className="mt-2 text-xs text-muted-foreground">
                No reservations for this section.
              </Text>
            ) : (
              <View className="mt-2 gap-2">
                <View className="flex-row flex-wrap items-center gap-3">
                  {(Object.keys(BUCKET_COLOR) as Bucket[]).map((b) => (
                    <View key={b} className="flex-row items-center gap-1.5">
                      <View
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: BUCKET_COLOR[b] }}
                      />
                      <Text className="text-xs text-muted-foreground">
                        {BUCKET_LABEL[b]}
                      </Text>
                    </View>
                  ))}
                </View>

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
                              style={{
                                color: busy ? "#ffffff" : colors.foreground,
                              }}
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
                      · {entryLabel(e.r)}
                    </Text>
                    <StatusBadge label={BUCKET_LABEL[bucketOf(e.r)]} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
