import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import {
  type BaseRecord,
  useApiUrl,
  useCustom,
  useList,
} from "@refinedev/core";
import { Calendar } from "react-native-calendars";
import { CalendarClock, Trash2 } from "lucide-react-native";

import { Can } from "@/components/can";
import { SectionLabel } from "@/components/refine-ui/field-row";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { axiosInstance } from "@/providers/axios";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { colors } from "@/lib/theme";
import {
  DaySlotStrip,
  fmtWall,
  SLOT_MS,
  slotEndTime,
  slotRuns,
  slotToTime,
} from "./day-slot-strip";

interface ToolReservation {
  id: string;
  toolId: string;
  note: string | null;
  status: "reserved" | "delivering" | "received" | "returning" | "returned";
  reservedFrom: string | null;
  reservedTo: string | null;
  receivedBy: string | null;
  tool: { id: string; code: string; name: string; status: string } | null;
}
interface ToolOpt extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  status?: string;
}
interface ToolCalendarRow {
  id: string;
  status: string;
  reservedFrom: string | null;
  reservedTo: string | null;
  stage: {
    id: string;
    name: string;
    estimatedStartDate: string | null;
    estimatedCompletedDate: string | null;
  } | null;
  order: { orderNumber: string } | null;
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
 * Tools reserved for this stage — SLOT-LEVEL reservation like the section
 * panel (mirrors the web): tap one or more days, toggle individual half-hour
 * boxes (same hours apply to every picked day), each contiguous run per day
 * becomes its own reservation row; the same tool may hold several disjoint
 * ranges. Handover stays QR-driven per row.
 */
export function StageTools({
  stageId,
  stageCompleted,
  windowStart,
  windowEnd,
}: {
  stageId: string;
  stageCompleted: boolean;
  /** Stage date window (YYYY-MM-DD) — reservations exist only inside it. */
  windowStart?: string | null;
  windowEnd?: string | null;
}) {
  const apiUrl = useApiUrl();
  const isAdmin = useIsAdmin();
  const { result, query } = useCustom<ToolReservation[]>({
    url: `${apiUrl}/process-stages/${stageId}/tool-reservations`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const reservations = Array.isArray(result?.data) ? result.data : [];
  const { result: tools } = useList<ToolOpt>({
    resource: "tools",
    pagination: { mode: "off" },
    errorNotification: false,
    queryOptions: { retry: false },
  });

  const [toolId, setToolId] = useState<string | null>(null);
  // null = creating; a reservation id = re-dating that reservation.
  const [editId, setEditId] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>([]);
  // Each picked day carries its OWN slot selection (different hours per day).
  const [slotsByDay, setSlotsByDay] = useState<Record<string, Set<number>>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const refetch = () => query.refetch();

  const hasWindow = Boolean(windowStart && windowEnd);

  // Every tool stays selectable — a stage may add MORE ranges of a tool it
  // already reserved (disjoint hours/days).
  const options: SelectOption[] = (tools?.data ?? []).map((t) => ({
    value: String(t.id),
    label:
      [t.code, t.name].filter(Boolean).join(" · ") +
      (t.status && t.status !== "available" ? ` (${t.status})` : ""),
  }));

  // The tool's reservations (all stages) — only the row being re-dated is
  // excluded; the stage's own other ranges block too.
  const { result: toolResRes, query: toolResQuery } = useCustom<
    ToolCalendarRow[]
  >({
    url: `${apiUrl}/tools/${toolId}/reservations`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false, enabled: Boolean(toolId) },
  });
  const taken = useMemo(
    () =>
      (Array.isArray(toolResRes?.data) ? toolResRes.data : []).filter(
        (r) => r.status !== "returned" && r.id !== editId,
      ),
    [toolResRes?.data, editId],
  );

  // Day-level paint (dot-marked, still selectable — hours may differ).
  const reservedDays = useMemo(() => {
    const set = new Set<string>();
    for (const r of taken) {
      const s = r.reservedFrom?.slice(0, 10) ?? r.stage?.estimatedStartDate;
      const e = r.reservedTo?.slice(0, 10) ?? r.stage?.estimatedCompletedDate;
      if (!s || !e) continue;
      eachDay(s, e).forEach((d) => set.add(d));
    }
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

  const takenRanges = useMemo(
    () =>
      taken.map((r) => ({
        from: r.reservedFrom
          ? Date.parse(r.reservedFrom)
          : r.stage?.estimatedStartDate
            ? Date.parse(`${r.stage.estimatedStartDate}T00:00:00.000Z`)
            : Number.NEGATIVE_INFINITY,
        to: r.reservedTo
          ? Date.parse(r.reservedTo)
          : r.stage?.estimatedCompletedDate
            ? Date.parse(`${r.stage.estimatedCompletedDate}T00:00:00.000Z`) +
              24 * 60 * 60 * 1000
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
  // Re-dating replaces ONE row → exactly one day + one contiguous run.
  const editShapeOk =
    !editId ||
    (days.length === 1 && (runsByDay[0]?.[1].length ?? 0) === 1);

  const canSubmit =
    Boolean(toolId && hasWindow) && rangeCount > 0 && editShapeOk && !busy;

  const fail = (err: { response?: { data?: { message?: string | string[] } } }) => {
    const msg = err?.response?.data?.message;
    Alert.alert("Failed", Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error"));
  };

  const submit = async () => {
    if (!canSubmit || !toolId) return;
    setBusy(true);
    try {
      if (editId) {
        const [from, toEx] = runsByDay[0][1][0];
        await axiosInstance.patch(
          `/process-stages/${stageId}/tool-reservations/${editId}`,
          {
            reservedFrom: `${days[0]}T${slotToTime(from)}:00.000Z`,
            reservedTo: `${days[0]}T${slotEndTime(toEx - 1)}:00.000Z`,
          },
        );
      } else {
        for (const [day, runs] of runsByDay) {
          for (const [from, toEx] of runs) {
            await axiosInstance.post(
              `/process-stages/${stageId}/tool-reservations`,
              {
                toolId,
                reservedFrom: `${day}T${slotToTime(from)}:00.000Z`,
                reservedTo: `${day}T${slotEndTime(toEx - 1)}:00.000Z`,
              },
            );
          }
        }
      }
      setSlotsByDay({});
      setDays([]);
      setEditId(null);
      setToolId(null);
      await Promise.all([query.refetch(), toolResQuery.refetch()]);
    } catch (e) {
      fail(e as never);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (r: ToolReservation) => {
    setEditId(r.id);
    setToolId(r.toolId);
    if (r.reservedFrom && r.reservedTo) {
      const day = r.reservedFrom.slice(0, 10);
      setDays([day]);
      const from = timeSlotOf(r.reservedFrom);
      const to = timeSlotOfEnd(r.reservedTo);
      const next = new Set<number>();
      for (let i = from; i < to; i += 1) next.add(i);
      setSlotsByDay({ [day]: next });
    }
  };

  const remove = (rid: string) =>
    axiosInstance
      .delete(`/process-stages/${stageId}/tool-reservations/${rid}`)
      .then(() => Promise.all([query.refetch(), toolResQuery.refetch()]))
      .catch(fail);
  const act = (rid: string, verb: string) =>
    axiosInstance
      .post(`/tool-reservations/${rid}/${verb}`)
      .then(refetch)
      .catch(fail);

  const handover = (
    r: ToolReservation,
  ): { verb: string; label: string } | null => {
    if (!isAdmin) return null;
    if (r.status === "reserved") return { verb: "deliver", label: "Deliver" };
    if (r.status === "delivering") return { verb: "receive", label: "Receive" };
    if (r.status === "received" && stageCompleted)
      return { verb: "return", label: "Return" };
    if (r.status === "returning")
      return { verb: "receive-return", label: "Receive return" };
    return null;
  };

  return (
    <View className="rounded-lg border border-border bg-card p-4">
      <SectionLabel>Reserved tools</SectionLabel>
      <Text className="mt-1 text-xs text-muted-foreground">
        The stage can't start until every reserved tool has been received.
        Handover is QR-driven.
      </Text>

      {query.isLoading ? (
        <Text className="mt-2 text-xs text-muted-foreground">Loading…</Text>
      ) : reservations.length === 0 ? (
        <Text className="mt-2 text-xs text-muted-foreground">
          No tools reserved.
        </Text>
      ) : (
        <View className="mt-2 gap-1.5">
          {reservations.map((r) => {
            const btn = handover(r);
            const actionable = [
              "reserved",
              "delivering",
              "received",
              "returning",
            ].includes(r.status);
            return (
              <View key={r.id} className="gap-0.5">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 pr-2 text-sm text-foreground">
                    {r.tool ? `${r.tool.code} · ${r.tool.name}` : "—"}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <StatusBadge label={r.status} />
                    {btn ? (
                      <Pressable
                        onPress={() => act(r.id, btn.verb)}
                        className="rounded-md border border-primary bg-primary px-3 py-1.5 active:opacity-80"
                      >
                        <Text className="text-xs text-primary-foreground">
                          {btn.label}
                        </Text>
                      </Pressable>
                    ) : !isAdmin && actionable ? (
                      <Text className="text-xs text-muted-foreground">Scan QR</Text>
                    ) : null}
                    <Can resource="process-stages" action="reserve-tools">
                      {r.status === "reserved" ? (
                        <Pressable onPress={() => startEdit(r)} hitSlop={6}>
                          <Icon
                            icon={CalendarClock}
                            size={16}
                            color={colors.mutedForeground}
                          />
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => remove(r.id)} hitSlop={6}>
                        <Icon icon={Trash2} size={16} color={colors.destructive} />
                      </Pressable>
                    </Can>
                  </View>
                </View>
                {r.reservedFrom && r.reservedTo ? (
                  <Text className="text-xs text-muted-foreground">
                    {fmtWall(r.reservedFrom, "")} → {fmtWall(r.reservedTo, "")}
                  </Text>
                ) : null}
                {r.receivedBy ? (
                  <Text className="text-xs text-muted-foreground">
                    received by {r.receivedBy}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <Can resource="process-stages" action="reserve-tools">
        <View className="mt-3 gap-3">
          <View className="flex-row items-center justify-between">
            <Label>{editId ? "Re-date reservation" : "Tool reservation"}</Label>
            {editId ? (
              <Pressable
                onPress={() => {
                  setEditId(null);
                  setToolId(null);
                  setDays([]);
                  setSlotsByDay({});
                }}
                hitSlop={6}
              >
                <Text className="text-xs text-primary">Cancel edit</Text>
              </Pressable>
            ) : null}
          </View>

          <SearchableSelect
            value={toolId}
            onChange={editId ? () => undefined : setToolId}
            options={options}
            placeholder="Select tool…"
          />

          {!hasWindow ? (
            <Text className="text-xs text-muted-foreground">
              Define the stage dates first — reservations must stay inside the
              stage window.
            </Text>
          ) : null}

          {toolId && hasWindow ? (
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
                current={days[0] ?? windowStart ?? undefined}
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
                    Kutulara tek tek dokunarak seçin/bırakın — her gün için
                    farklı saatler seçilebilir. Kırmızı kutular o gün dolu,
                    alınamaz.
                  </Text>
                </>
              ) : null}

              {!editShapeOk ? (
                <Text className="text-xs text-destructive">
                  Yeniden tarihleme tek gün ve tek bitişik saat aralığı ile
                  yapılabilir.
                </Text>
              ) : null}

              <Text className="text-xs text-muted-foreground">
                {rangeCount > 0
                  ? `${days.length} gün · toplam ${rangeCount} saat aralığı = ${rangeCount} rezervasyon`
                  : `Reservation must stay inside the stage window (${windowStart} → ${windowEnd}).`}
              </Text>

              <Button
                label={editId ? "Update reservation" : "Reserve tool"}
                size="sm"
                disabled={!canSubmit}
                loading={busy}
                onPress={submit}
              />

              {taken.length > 0 ? (
                <View className="gap-0.5">
                  {taken.map((r) => (
                    <Text key={r.id} className="text-xs text-muted-foreground">
                      {r.order?.orderNumber ?? r.stage?.name ?? "—"} ·{" "}
                      {fmtWall(r.reservedFrom, r.stage?.estimatedStartDate ?? "—")}{" "}
                      → {fmtWall(r.reservedTo, r.stage?.estimatedCompletedDate ?? "—")}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </Can>
    </View>
  );
}

/** "…T09:30:00.000Z" → its start slot index. */
function timeSlotOf(iso: string): number {
  const h = Number(iso.slice(11, 13));
  const m = Number(iso.slice(14, 16));
  return h * 2 + (m >= 30 ? 1 : 0);
}
/** End ISO → exclusive end slot (23:59 counts as end-of-day). */
function timeSlotOfEnd(iso: string): number {
  const h = Number(iso.slice(11, 13));
  const m = Number(iso.slice(14, 16));
  if (h === 23 && m >= 59) return 48;
  return h * 2 + (m >= 30 ? 1 : 0);
}
