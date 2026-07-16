import { useApiUrl, useCustom, useList, useNotification } from "@refinedev/core";
import { eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
import { CalendarClock, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Can } from "@/components/can";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { axiosInstance } from "@/providers/axios";
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
  deliveredBy: string | null;
  tool: { id: string; code: string; name: string; status: string } | null;
}
interface ToolOpt {
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

/**
 * Tools reserved for this stage — SLOT-LEVEL reservation like the section
 * panel: pick one or more days, toggle individual half-hour boxes (same
 * hours apply to every picked day, e.g. 09:00–12:00 across three days) and
 * each contiguous run per day becomes its own reservation row. The same tool
 * may hold several disjoint ranges. Handover stays QR-driven per row.
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
  const { open: notify } = useNotification();
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

  const [toolId, setToolId] = useState("");
  // null = creating; a reservation id = re-dating that reservation.
  const [editId, setEditId] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>([]);
  // Each picked day carries its OWN slot selection (different hours per day).
  const [slotsByDay, setSlotsByDay] = useState<Record<string, Set<number>>>(
    {},
  );
  const [busySubmit, setBusySubmit] = useState(false);
  const refetch = () => query.refetch();

  const hasWindow = Boolean(windowStart && windowEnd);

  // Every tool stays selectable — a stage may add MORE ranges of a tool it
  // already reserved (disjoint hours/days).
  const options = tools?.data ?? [];

  // The tool's reservations (all stages) — availability awareness. Only the
  // row being re-dated is excluded; the stage's own other ranges block too.
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

  // Day-level paint (busy days stay selectable — hours may differ).
  const reservedDays = useMemo(() => {
    const out: Date[] = [];
    for (const r of taken) {
      const s = r.reservedFrom?.slice(0, 10) ?? r.stage?.estimatedStartDate;
      const e = r.reservedTo?.slice(0, 10) ?? r.stage?.estimatedCompletedDate;
      if (!s || !e) continue;
      try {
        eachDayOfInterval({ start: parseISO(s), end: parseISO(e) }).forEach(
          (d) => out.push(d),
        );
      } catch {
        /* ignore malformed */
      }
    }
    return out;
  }, [taken]);
  const isAvailable = (day: Date) =>
    !reservedDays.some((d) => isSameDay(d, day));

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
      days.map(
        (d) => [d, slotRuns(slotsByDay[d] ?? new Set())] as const,
      ),
    [days, slotsByDay],
  );
  const rangeCount = runsByDay.reduce((n, [, r]) => n + r.length, 0);
  // Re-dating replaces ONE row → exactly one day + one contiguous run.
  const editShapeOk =
    !editId ||
    (days.length === 1 && (runsByDay[0]?.[1].length ?? 0) === 1);

  const canSubmit =
    Boolean(toolId && hasWindow) && rangeCount > 0 && editShapeOk && !busySubmit;

  const submit = async () => {
    if (!canSubmit) return;
    setBusySubmit(true);
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
        // One POST per (day, contiguous run).
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
      await Promise.all([query.refetch(), toolResQuery.refetch()]);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Rezervasyon başarısız";
      notify?.({ type: "error", message: String(msg) });
    } finally {
      setBusySubmit(false);
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
      .catch(() =>
        notify?.({ type: "error", message: "Rezervasyon silinemedi" }),
      );
  const act = (rid: string, verb: string) =>
    axiosInstance
      .post(`/tool-reservations/${rid}/${verb}`)
      .then(refetch)
      .catch((e) =>
        notify?.({
          type: "error",
          message: String(
            (e as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? "İşlem başarısız",
          ),
        }),
      );

  // The admin handover button for a reservation's current status (or null).
  const handoverButton = (r: ToolReservation) => {
    if (!isAdmin) return null;
    if (r.status === "reserved")
      return <Button size="sm" onClick={() => void act(r.id, "deliver")}>Deliver</Button>;
    if (r.status === "delivering")
      return <Button size="sm" onClick={() => void act(r.id, "receive")}>Receive</Button>;
    if (r.status === "received" && stageCompleted)
      return <Button size="sm" onClick={() => void act(r.id, "return")}>Return</Button>;
    if (r.status === "returning")
      return (
        <Button size="sm" onClick={() => void act(r.id, "receive-return")}>
          Receive return
        </Button>
      );
    return null;
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="text-sm font-medium">Reserved tools</div>
      <p className="text-xs text-muted-foreground">
        The stage can't start until every reserved tool has been received by a
        stage worker. Handover is QR-driven.
      </p>

      {query.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : reservations.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tools reserved.</p>
      ) : (
        <ul className="space-y-1">
          {reservations.map((r) => {
            const actionable = ["reserved", "delivering", "received", "returning"].includes(
              r.status,
            );
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0">
                  {r.tool ? `${r.tool.code} · ${r.tool.name}` : "—"}
                  {r.reservedFrom && r.reservedTo ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      · {fmtWall(r.reservedFrom, "")} →{" "}
                      {fmtWall(r.reservedTo, "")}
                    </span>
                  ) : null}
                  {r.receivedBy ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      · received by {r.receivedBy}
                    </span>
                  ) : null}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge label={r.status} />
                  {handoverButton(r)}
                  {!isAdmin && actionable ? (
                    <span className="text-xs text-muted-foreground">
                      Scan QR to hand over
                    </span>
                  ) : null}
                  <Can perm="process-stages:reserve-tools">
                    {r.status === "reserved" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Re-date reservation"
                        onClick={() => startEdit(r)}
                      >
                        <CalendarClock className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => void remove(r.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </Can>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Can perm="process-stages:reserve-tools">
        <div className="space-y-3 border-t pt-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">
              {editId ? "Re-date reservation" : "Tool reservation"}
            </Label>
            {editId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditId(null);
                  setToolId("");
                  setDays([]);
                  setSlotsByDay({});
                }}
              >
                Cancel edit
              </Button>
            )}
          </div>

          <Select
            value={toolId}
            onValueChange={setToolId}
            disabled={Boolean(editId)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tool…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {[t.code, t.name].filter(Boolean).join(" · ")}
                  {t.status && t.status !== "available" ? ` (${t.status})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!hasWindow && (
            <p className="text-xs text-muted-foreground">
              Önce aşama tarihlerini tanımlayın — rezervasyon yalnızca aşamanın
              tarih aralığında yapılabilir.
            </p>
          )}

          {toolId && hasWindow && (
            <>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded border border-green-400 bg-green-100" />
                  Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-red-500" />
                  Reserved
                </span>
              </div>
              <Calendar
                mode="multiple"
                selected={days.map((d) => parseISO(d))}
                onSelect={(sel) => {
                  const next = (sel ?? [])
                    .map((d) => format(d, "yyyy-MM-dd"))
                    .sort();
                  setDays(next);
                  // Drop slot selections of unpicked days.
                  setSlotsByDay((prev) =>
                    Object.fromEntries(
                      Object.entries(prev).filter(([d]) => next.includes(d)),
                    ),
                  );
                }}
                defaultMonth={parseISO(windowStart!)}
                disabled={[
                  { before: parseISO(windowStart!) },
                  { after: parseISO(windowEnd!) },
                ]}
                modifiers={{ reserved: reservedDays, available: isAvailable }}
                modifiersClassNames={{
                  reserved: "bg-red-500/60 text-white",
                  available: "bg-green-100 text-green-900",
                }}
                className="rounded-md border"
              />
              <p className="text-[10px] text-muted-foreground">
                Takvimden bir veya birden fazla gün seçin; her günün saat
                kutuları AYRI ayrı seçilir.
              </p>

              {days.length > 0 && (
                <div className="space-y-3">
                  {days.map((day) => (
                    <DaySlotStrip
                      key={day}
                      label={`Saat kutuları · ${day}`}
                      isBusy={busyAt(day)}
                      selected={slotsByDay[day] ?? new Set()}
                      onToggle={(slot) => toggleSlot(day, slot)}
                    />
                  ))}
                  <p className="text-[10px] text-muted-foreground">
                    Kutulara tek tek dokunarak seçin/bırakın — her gün için
                    farklı saatler seçilebilir. Kırmızı kutular o gün dolu,
                    alınamaz.
                  </p>
                </div>
              )}

              {!editShapeOk && (
                <p className="text-xs text-destructive">
                  Yeniden tarihleme tek gün ve tek bitişik saat aralığı ile
                  yapılabilir.
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {rangeCount > 0
                    ? `${days.length} gün · toplam ${rangeCount} saat aralığı = ${rangeCount} rezervasyon`
                    : `Rezervasyon aşamanın tarih aralığında olmalı (${windowStart} → ${windowEnd}).`}
                </span>
                <Button size="sm" disabled={!canSubmit} onClick={() => void submit()}>
                  {busySubmit ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : editId ? (
                    "Update reservation"
                  ) : (
                    "Reserve tool"
                  )}
                </Button>
              </div>

              {taken.length > 0 && (
                <ul className="text-xs text-muted-foreground">
                  {taken.map((r) => (
                    <li key={r.id}>
                      <span className="mr-1 rounded border px-1">
                        {r.order?.orderNumber ?? r.stage?.name ?? "—"}
                      </span>
                      {fmtWall(
                        r.reservedFrom,
                        r.stage?.estimatedStartDate ?? "—",
                      )}{" "}
                      →{" "}
                      {fmtWall(r.reservedTo, r.stage?.estimatedCompletedDate ?? "—")}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Can>
    </div>
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
