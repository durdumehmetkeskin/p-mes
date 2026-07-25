import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useList } from "@refinedev/core";
import { Calendar } from "react-native-calendars";
import { CalendarClock, Trash2 } from "lucide-react-native";
import { toast } from "sonner-native";

import { SectionLabel } from "@/components/refine-ui/field-row";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { showApiError } from "@/components/ui/error-alert";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";
import { fmtWall } from "./day-slot-strip";

interface ReservationRow extends BaseRecord {
  id: string;
  sectionId?: string;
  startDate?: string;
  endDate?: string;
  startAt?: string | null;
  endAt?: string | null;
  section?: { id?: string; locationId?: string; code?: string } | null;
  order?: { orderNumber?: string } | null;
}

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
 * Section (location) reservation — SAME structure as the tool reservation
 * block (StageTools): pick location + section, tap a start and an end day on
 * the calendar (period marking) and enter a start and an end time. The whole
 * continuous span counts as reserved and is stored as ONE reservation row
 * (the backend composes startDate+startTime → endDate+endTime). Existing
 * rows are listed, re-datable and removable.
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
  // null = creating; a reservation id = re-dating that reservation.
  const [editId, setEditId] = useState<string | null>(null);
  // ONE continuous span: a date range (two taps) + a start and an end time.
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [busy, setBusy] = useState(false);

  // This stage's own reservations (listed + removable/re-datable).
  const { result: mineRes, query: mineQuery } = useList<ReservationRow>({
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
  const { result: resvRes, query: resvQuery } = useList<ReservationRow>({
    resource: "section-reservations",
    filters: sectionId
      ? [{ field: "sectionId", operator: "eq", value: sectionId }]
      : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!sectionId, retry: false },
    errorNotification: false,
  });
  // The section's reservations block the span — only the row being re-dated
  // is excluded.
  const taken = useMemo(
    () => (resvRes?.data ?? []).filter((r) => String(r.id) !== editId),
    [resvRes?.data, editId],
  );

  // Day-level paint (dot-marked, still selectable — hours may differ).
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
    if (rangeStart) {
      const end = rangeEnd ?? rangeStart;
      const span = eachDay(rangeStart, end);
      span.forEach((d, i) => {
        m[d] = {
          ...(m[d] ?? {}),
          startingDay: i === 0,
          endingDay: i === span.length - 1,
          color: colors.primary,
          textColor: colors.primaryForeground,
        };
      });
    }
    return m;
  }, [reservedDays, rangeStart, rangeEnd]);

  // Two-tap range: first tap = start, second tap (>= start) = end.
  const onDayPress = (day: { dateString: string }) => {
    const d = day.dateString;
    if (!rangeStart || rangeEnd) {
      setRangeStart(d);
      setRangeEnd(null);
    } else if (d >= rangeStart) {
      setRangeEnd(d);
    } else {
      setRangeStart(d);
      setRangeEnd(null);
    }
  };

  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const endDay = rangeEnd ?? rangeStart;
  const reservedFrom =
    rangeStart && TIME_RE.test(startTime)
      ? Date.parse(`${rangeStart}T${startTime}:00.000Z`)
      : Number.NaN;
  const reservedTo =
    endDay && TIME_RE.test(endTime)
      ? Date.parse(`${endDay}T${endTime}:00.000Z`)
      : Number.NaN;
  const rangeValid =
    Number.isFinite(reservedFrom) &&
    Number.isFinite(reservedTo) &&
    reservedTo > reservedFrom;

  const canSubmit = !!sectionId && rangeValid && !busy;

  const resetForm = () => {
    setEditId(null);
    setRangeStart(null);
    setRangeEnd(null);
    setStartTime("00:00");
    setEndTime("23:59");
  };

  const submit = async () => {
    if (!canSubmit || !rangeStart || !endDay) return;
    setBusy(true);
    try {
      if (editId) {
        await axiosInstance.patch(`/section-reservations/${editId}`, {
          startDate: rangeStart,
          endDate: endDay,
          startTime,
          endTime,
        });
      } else {
        await axiosInstance.post("/section-reservations", {
          sectionId,
          orderId,
          stageId,
          startDate: rangeStart,
          endDate: endDay,
          startTime,
          endTime,
        });
      }
      resetForm();
      invalidate({ resource: "section-reservations", invalidates: ["list"] });
      await Promise.all([mineQuery.refetch(), resvQuery.refetch()]);
      toast.success(editId ? "Reservation updated" : "Section reserved");
      onChanged?.();
    } catch (err) {
      showApiError(err, "Rezervasyon yapılamadı");
    } finally {
      setBusy(false);
    }
  };

  // Re-date an existing row: keep its section, prefill range + times.
  const startEdit = (r: ReservationRow) => {
    setEditId(String(r.id));
    if (r.section?.locationId) setLocationId(String(r.section.locationId));
    if (r.sectionId) setSectionId(String(r.sectionId));
    if (r.startDate) setRangeStart(r.startDate);
    if (r.endDate) setRangeEnd(r.endDate);
    setStartTime(r.startAt ? String(r.startAt).slice(11, 16) : "00:00");
    setEndTime(r.endAt ? String(r.endAt).slice(11, 16) : "23:59");
  };

  const removeReservation = async (id: string) => {
    try {
      await axiosInstance.delete(`/section-reservations/${id}`);
      invalidate({ resource: "section-reservations", invalidates: ["list"] });
      await Promise.all([mineQuery.refetch(), resvQuery.refetch()]);
      onChanged?.();
    } catch (err) {
      showApiError(err, "Rezervasyon kaldırılamadı");
    }
  };

  return (
    <View className="gap-3 rounded-lg border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <SectionLabel>
          {editId ? "Re-date reservation" : "Section reservation"}
        </SectionLabel>
        {editId ? (
          <Pressable onPress={resetForm} hitSlop={6}>
            <Text className="text-xs text-primary">Cancel edit</Text>
          </Pressable>
        ) : null}
      </View>

      {mine.length > 0 ? (
        <View className="gap-1">
          {mine.map((r) => (
            <View key={String(r.id)} className="flex-row items-center gap-2">
              <Text className="flex-1 text-xs text-muted-foreground">
                {r.section?.code ? `${r.section.code} · ` : ""}
                {fmtWall(r.startAt ? String(r.startAt) : null, String(r.startDate))} →{" "}
                {fmtWall(r.endAt ? String(r.endAt) : null, String(r.endDate))}
              </Text>
              {canManage ? (
                <>
                  <Pressable onPress={() => startEdit(r)} hitSlop={6}>
                    <Icon
                      icon={CalendarClock}
                      size={14}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => void removeReservation(String(r.id))}
                    hitSlop={6}
                  >
                    <Icon icon={Trash2} size={14} color={colors.destructive} />
                  </Pressable>
                </>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View className="gap-1.5">
        <Label>Location</Label>
        <SearchableSelect
          value={locationId}
          disabled={Boolean(editId)}
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
            disabled={Boolean(editId)}
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
            markingType="period"
            markedDates={marked}
            onDayPress={onDayPress}
            minDate={windowStart ?? undefined}
            maxDate={windowEnd ?? undefined}
            current={rangeStart ?? windowStart ?? undefined}
            theme={calTheme}
            style={{ borderRadius: 8 }}
          />
          <Text className="text-[10px] text-muted-foreground">
            Takvimden başlangıç ve bitiş gününü seçin; aşağıya başlangıç ve
            bitiş saatini girin. Bölüm bu aralıktaki TÜM saatlerde rezerve
            sayılır.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <Label>Başlangıç saati</Label>
              <Input
                value={startTime}
                onChangeText={setStartTime}
                placeholder="08:00"
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View className="flex-1 gap-1">
              <Label>Bitiş saati</Label>
              <Input
                value={endTime}
                onChangeText={setEndTime}
                placeholder="17:00"
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <Text className="text-xs text-muted-foreground">
            {rangeValid
              ? `${rangeStart} ${startTime} → ${endDay} ${endTime}`
              : windowStart && windowEnd
                ? `Stage window: ${windowStart} → ${windowEnd}`
                : "Takvimden gün(ler) seçin ve saatleri girin."}
          </Text>

          <Button
            label={editId ? "Update reservation" : "Reserve"}
            disabled={!canSubmit}
            loading={busy}
            onPress={submit}
          />

          {taken.length > 0 ? (
            <View className="gap-0.5">
              {taken.map((r) => (
                <Text key={String(r.id)} className="text-xs text-muted-foreground">
                  {r.order?.orderNumber ?? "—"} ·{" "}
                  {fmtWall(r.startAt ? String(r.startAt) : null, String(r.startDate))}{" "}
                  → {fmtWall(r.endAt ? String(r.endAt) : null, String(r.endDate))}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
