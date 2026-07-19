import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useList } from "@refinedev/core";
import { Calendar } from "react-native-calendars";
import { Trash2 } from "lucide-react-native";
import { toast } from "sonner-native";

import { SectionLabel } from "@/components/refine-ui/field-row";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";
import {
  DaySlotStrip,
  fmtWall,
  SLOT_MS,
  slotEndTime,
  slotRuns,
  slotToTime,
} from "./day-slot-strip";

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
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
  selectedDayBackgroundColor: colors.primary,
  selectedDayTextColor: colors.primaryForeground,
  textSectionTitleColor: colors.mutedForeground,
} as const;

/**
 * Section (location) reservation with SLOT-LEVEL precision, mirroring the
 * web: tap one or more days on the calendar, then toggle individual
 * half-hour boxes — the same hours apply to every picked day (e.g.
 * 09:00–12:00 across three days). Each contiguous run per day is stored as
 * its own reservation row; this stage's rows are listed and removable.
 */
export function StageReservation({
  canManage = false,
  stageId,
  orderId,
  windowStart,
  windowEnd,
  onChanged,
}: {
  /** Process responsible or admin — manages reservations without keys. */
  canManage?: boolean;
  stageId: string;
  orderId?: string;
  /** Stage date window (YYYY-MM-DD) — reservation must stay inside it. */
  windowStart?: string | null;
  windowEnd?: string | null;
  onChanged?: () => void;
}) {
  const invalidate = useInvalidate();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>([]);
  // Each picked day carries its OWN slot selection (different hours per day).
  const [slotsByDay, setSlotsByDay] = useState<Record<string, Set<number>>>(
    {},
  );
  const [busy, setBusy] = useState(false);

  // This stage's own reservations (listed + removable).
  const { result: mineRes, query: mineQuery } = useList<BaseRecord>({
    resource: "section-reservations",
    filters: [{ field: "stageId", operator: "eq", value: stageId }],
    sorters: [{ field: "startDate", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const mine = mineRes?.data ?? [];

  const { result: locRes } = useList<BaseRecord>({
    resource: "locations",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const { result: secRes } = useList<BaseRecord>({
    resource: "sections",
    filters: locationId
      ? [{ field: "locationId", operator: "eq", value: locationId }]
      : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!locationId, retry: false },
    errorNotification: false,
  });
  const { result: resvRes, query: resvQuery } = useList<BaseRecord>({
    resource: "section-reservations",
    filters: sectionId
      ? [{ field: "sectionId", operator: "eq", value: sectionId }]
      : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!sectionId, retry: false },
    errorNotification: false,
  });
  const taken = resvRes?.data ?? [];

  // Busy days: dot-marked red but SELECTABLE — the hours may differ.
  const reservedDays = useMemo(() => {
    const set = new Set<string>();
    taken.forEach((r) => {
      if (r.startDate && r.endDate)
        eachDay(r.startDate, r.endDate).forEach((d) => set.add(d));
    });
    return set;
  }, [taken]);

  const marked = useMemo(() => {
    const m: Record<string, Record<string, unknown>> = {};
    reservedDays.forEach((d) => {
      m[d] = { marked: true, dotColor: colors.destructive };
    });
    days.forEach((d) => {
      m[d] = {
        ...(m[d] ?? {}),
        selected: true,
        selectedColor: colors.primary,
        selectedTextColor: colors.primaryForeground,
      };
    });
    return m;
  }, [reservedDays, days]);

  // Multi-day toggle: tapping a day adds/removes it from the selection.
  const onDayPress = (day: { dateString: string }) => {
    const d = day.dateString;
    setDays((prev) => {
      const next = prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort();
      if (!next.includes(d)) {
        setSlotsByDay((s) => {
          const copy = { ...s };
          delete copy[d];
          return copy;
        });
      }
      return next;
    });
  };

  // Half-hour busy arithmetic (epoch over wall-clock ISO strings).
  const takenRanges = useMemo(
    () =>
      taken.map((r) => ({
        from: r.startAt
          ? Date.parse(String(r.startAt))
          : r.startDate
            ? Date.parse(`${r.startDate}T00:00:00.000Z`)
            : Number.NEGATIVE_INFINITY,
        to: r.endAt
          ? Date.parse(String(r.endAt))
          : r.endDate
            ? Date.parse(`${r.endDate}T00:00:00.000Z`) + 24 * 60 * 60 * 1000
            : Number.POSITIVE_INFINITY,
      })),
    [taken],
  );
  const busyAt = (dayIso: string) => (slot: number) => {
    const s = Date.parse(`${dayIso}T00:00:00.000Z`) + slot * SLOT_MS;
    return takenRanges.some((r) => r.from < s + SLOT_MS && r.to > s);
  };
  const toggleSlot = (day: string, slot: number) =>
    setSlotsByDay((prev) => {
      const next = new Set(prev[day] ?? []);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return { ...prev, [day]: next };
    });

  // Contiguous slot runs PER DAY → one reservation range per (day, run).
  const runsByDay = useMemo(
    () =>
      days.map((d) => [d, slotRuns(slotsByDay[d] ?? new Set())] as const),
    [days, slotsByDay],
  );
  const rangeCount = runsByDay.reduce((n, [, r]) => n + r.length, 0);

  const canSubmit = !!locationId && !!sectionId && rangeCount > 0 && !busy;

  const reserve = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      // One POST per (day, contiguous run) — stageId rides along so the
      // server enforces/syncs the stage window.
      for (const [day, runs] of runsByDay) {
        for (const [from, toEx] of runs) {
          await axiosInstance.post("/section-reservations", {
            sectionId,
            orderId,
            stageId,
            startDate: day,
            endDate: day,
            startTime: slotToTime(from),
            endTime: slotEndTime(toEx - 1),
          });
        }
      }
      setSlotsByDay({});
      setDays([]);
      invalidate({ resource: "section-reservations", invalidates: ["list"] });
      await Promise.all([mineQuery.refetch(), resvQuery.refetch()]);
      toast.success("Section reserved");
      onChanged?.();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(typeof msg === "string" ? msg : "Could not reserve");
    } finally {
      setBusy(false);
    }
  };

  const removeReservation = async (id: string) => {
    try {
      await axiosInstance.delete(`/section-reservations/${id}`);
      invalidate({ resource: "section-reservations", invalidates: ["list"] });
      await Promise.all([mineQuery.refetch(), resvQuery.refetch()]);
      onChanged?.();
    } catch {
      toast.error("Could not remove reservation");
    }
  };

  return (
    <View className="gap-3 rounded-lg border border-border bg-card p-4">
      <SectionLabel>Section reservation</SectionLabel>

      {mine.length > 0 ? (
        <View className="gap-1">
          {mine.map((r) => (
            <View key={String(r.id)} className="flex-row items-center gap-2">
              <Text className="flex-1 text-xs text-muted-foreground">
                {fmtWall(r.startAt ? String(r.startAt) : null, String(r.startDate))} →{" "}
                {fmtWall(r.endAt ? String(r.endAt) : null, String(r.endDate))}
              </Text>
              {canManage ? (
                <Pressable
                  onPress={() => void removeReservation(String(r.id))}
                  hitSlop={6}
                >
                  <Icon icon={Trash2} size={14} color={colors.destructive} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View className="gap-1.5">
        <Label>Location</Label>
        <SearchableSelect
          value={locationId}
          onChange={(v) => {
            setLocationId(v);
            setSectionId(null);
          }}
          options={(locRes?.data ?? []).map((l) => ({
            label: [l.code, l.name].filter(Boolean).join(" · "),
            value: String(l.id),
          }))}
          placeholder="Select location"
        />
      </View>

      {locationId ? (
        <View className="gap-1.5">
          <Label>Section</Label>
          <SearchableSelect
            value={sectionId}
            onChange={setSectionId}
            options={(secRes?.data ?? []).map((s) => ({
              label: [s.code, s.name].filter(Boolean).join(" · "),
              value: String(s.id),
            }))}
            placeholder="Select section"
          />
        </View>
      ) : null}

      {sectionId ? (
        <>
          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center gap-1.5">
              <View className="h-3 w-3 rounded bg-success/40" />
              <Text className="text-xs text-muted-foreground">Available</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="h-3 w-3 rounded bg-destructive" />
              <Text className="text-xs text-muted-foreground">Reserved</Text>
            </View>
          </View>

          <Calendar
            markedDates={marked}
            onDayPress={onDayPress}
            minDate={windowStart ?? undefined}
            maxDate={windowEnd ?? undefined}
            theme={calTheme}
            style={{ borderRadius: 8 }}
          />
          <Text className="text-[10px] text-muted-foreground">
            Bir veya birden fazla güne dokunarak seçin; her günün saat
            kutuları AYRI ayrı seçilir.
          </Text>

          {days.length > 0 ? (
            <>
              {days.map((day) => (
                <DaySlotStrip
                  key={day}
                  label={`Saat kutuları · ${day}`}
                  isBusy={busyAt(day)}
                  selected={slotsByDay[day] ?? new Set()}
                  onToggle={(slot) => toggleSlot(day, slot)}
                />
              ))}
              <Text className="text-[10px] text-muted-foreground">
                Kutulara tek tek dokunarak seçin/bırakın — her gün için farklı
                saatler seçilebilir. Kırmızı kutular o gün dolu, alınamaz.
              </Text>
            </>
          ) : null}

          <Text className="text-xs text-muted-foreground">
            {rangeCount > 0
              ? `${days.length} gün · toplam ${rangeCount} saat aralığı = ${rangeCount} rezervasyon`
              : windowStart && windowEnd
                ? `Stage window: ${windowStart} → ${windowEnd}`
                : "Gün(ler) ve saat kutularını seçin."}
          </Text>
          <Button
            label="Reserve"
            disabled={!canSubmit}
            loading={busy}
            onPress={reserve}
          />
        </>
      ) : null}
    </View>
  );
}
