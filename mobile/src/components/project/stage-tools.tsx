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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { axiosInstance } from "@/providers/axios";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { colors } from "@/lib/theme";
import { fmtWall } from "./day-slot-strip";

interface ToolReservation {
  id: string;
  toolId: string;
  note: string | null;
  status: "reserved" | "delivering" | "received" | "returning" | "returned";
  /** False while the tool is in use / mid-handover elsewhere — hide Deliver. */
  deliverable?: boolean;
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
 * Tools reserved for this stage — ONE continuous span per reservation
 * (mirrors the web): pick a start/end day on the calendar plus a start and an
 * end time; every hour in between counts as reserved. The same tool may hold
 * several disjoint spans. Handover stays QR-driven per row.
 */
export function StageTools({
  stageId,
  stageCompleted,
  windowStart,
  windowEnd,
  canManage = false,
}: {
  stageId: string;
  stageCompleted: boolean;
  /** Reserve/re-date/remove tool reservations — process responsible or
   *  admin (backend also honors the reserve-tools key). */
  canManage?: boolean;
  /** Stage date window (YYYY-MM-DD) — reservations exist only inside it. */
  windowStart?: string | null;
  windowEnd?: string | null;
}) {
  const apiUrl = useApiUrl();
  const isAdmin = useIsAdmin();
  // Everything here reads tools:read-guarded data — don't even ask without
  // the key (a plain member would just collect silent 403s).
  const { has } = usePermissions();
  const canReadTools = has("tools:read");
  // Reservation mutations: responsible/admin (prop) or legacy key holders.
  const canReserve = canManage || has("process-stages:reserve-tools");
  const { result, query } = useCustom<ToolReservation[]>({
    url: `${apiUrl}/process-stages/${stageId}/tool-reservations`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false, enabled: canReadTools },
  });
  const reservations = Array.isArray(result?.data) ? result.data : [];
  const { result: tools } = useList<ToolOpt>({
    resource: "tools",
    pagination: { mode: "off" },
    errorNotification: false,
    queryOptions: { retry: false, enabled: canReadTools },
  });

  const [toolId, setToolId] = useState<string | null>(null);
  // null = creating; a reservation id = re-dating that reservation.
  const [editId, setEditId] = useState<string | null>(null);
  // ONE continuous span: a date range (two taps) + a start and an end time.
  // Every hour between `from startTime` and `to endTime` counts as reserved.
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
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
    queryOptions: { retry: false, enabled: Boolean(toolId) && canReadTools },
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
      ? `${rangeStart}T${startTime}:00.000Z`
      : null;
  const reservedTo =
    endDay && TIME_RE.test(endTime) ? `${endDay}T${endTime}:00.000Z` : null;
  const rangeValid =
    Boolean(reservedFrom && reservedTo) &&
    Date.parse(reservedTo as string) > Date.parse(reservedFrom as string);

  const canSubmit = Boolean(toolId && hasWindow) && rangeValid && !busy;

  const fail = (err: { response?: { data?: { message?: string | string[] } } }) => {
    const msg = err?.response?.data?.message;
    Alert.alert("Failed", Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error"));
  };

  const submit = async () => {
    if (!canSubmit || !toolId || !reservedFrom || !reservedTo) return;
    setBusy(true);
    try {
      if (editId) {
        await axiosInstance.patch(
          `/process-stages/${stageId}/tool-reservations/${editId}`,
          { reservedFrom, reservedTo },
        );
      } else {
        await axiosInstance.post(
          `/process-stages/${stageId}/tool-reservations`,
          { toolId, reservedFrom, reservedTo },
        );
      }
      setRangeStart(null);
      setRangeEnd(null);
      setStartTime("00:00");
      setEndTime("23:59");
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
      setRangeStart(r.reservedFrom.slice(0, 10));
      setRangeEnd(r.reservedTo.slice(0, 10));
      setStartTime(r.reservedFrom.slice(11, 16));
      setEndTime(r.reservedTo.slice(11, 16));
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
    // No Deliver while the tool is in use / mid-handover on another
    // reservation (same stage or elsewhere) — the busy hint renders instead.
    if (r.status === "reserved" && r.deliverable === false) return null;
    if (r.status === "reserved") return { verb: "deliver", label: "Deliver" };
    if (r.status === "delivering") return { verb: "receive", label: "Receive" };
    // Return is allowed any time after receive (not only once the stage is
    // completed) — work with the tool may finish early.
    if (r.status === "received") return { verb: "return", label: "Return" };
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
                    ) : r.status === "reserved" && r.deliverable === false ? (
                      <Text className="text-xs text-muted-foreground">
                        Araç müsait değil
                      </Text>
                    ) : !isAdmin && actionable ? (
                      <Text className="text-xs text-muted-foreground">Scan QR</Text>
                    ) : null}
                    {canReserve ? (
                      <>
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
                      </>
                    ) : null}
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

      {canReserve ? (
        <View className="mt-3 gap-3">
          <View className="flex-row items-center justify-between">
            <Label>{editId ? "Re-date reservation" : "Tool reservation"}</Label>
            {editId ? (
              <Pressable
                onPress={() => {
                  setEditId(null);
                  setToolId(null);
                  setRangeStart(null);
                  setRangeEnd(null);
                  setStartTime("00:00");
                  setEndTime("23:59");
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
                Takvimden başlangıç ve bitiş gününü seçin; aşağıya başlangıç
                ve bitiş saatini girin. Araç bu aralıktaki TÜM saatlerde
                rezerve sayılır.
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
      ) : null}
    </View>
  );
}

