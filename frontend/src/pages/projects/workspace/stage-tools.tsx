import { useApiUrl, useCustom, useList, useNotification } from "@refinedev/core";
import { eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
import { CalendarClock, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { axiosInstance } from "@/providers/axios";
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
 * Tools reserved for this stage — ONE continuous span per reservation: pick a
 * start/end day on the calendar plus a start and an end time; every hour in
 * between (middle days fully) counts as reserved, and the tool's reservation
 * calendar paints it the same way. The same tool may hold several disjoint
 * spans. Handover stays QR-driven per row.
 */
export function StageTools({
  stageId,
  windowStart,
  windowEnd,
  canManage = false,
}: {
  stageId: string;
  /** Unused since Return stopped waiting for completion; kept for callers. */
  stageCompleted?: boolean;
  /** Reserve/re-date/remove tool reservations — process responsible or
   *  admin (backend also honors the reserve-tools key). */
  canManage?: boolean;
  /** Stage date window (YYYY-MM-DD) — reservations exist only inside it. */
  windowStart?: string | null;
  windowEnd?: string | null;
}) {
  const apiUrl = useApiUrl();
  const isAdmin = useIsAdmin();
  const { open: notify } = useNotification();
  // Everything here reads tools:read-guarded data — don't even ask without
  // the key (a plain member would just collect 403s in the console).
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

  const [toolId, setToolId] = useState("");
  // null = creating; a reservation id = re-dating that reservation.
  const [editId, setEditId] = useState<string | null>(null);
  // ONE continuous span: a date range + a start time and an end time. Every
  // hour between `from startTime` and `to endTime` (middle days fully) counts
  // as reserved.
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
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
    queryOptions: { retry: false, enabled: Boolean(toolId) && canReadTools },
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

  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const startDay = range.from ? format(range.from, "yyyy-MM-dd") : null;
  const endDay = range.to
    ? format(range.to, "yyyy-MM-dd")
    : startDay;
  const reservedFrom =
    startDay && TIME_RE.test(startTime)
      ? `${startDay}T${startTime}:00.000Z`
      : null;
  const reservedTo =
    endDay && TIME_RE.test(endTime) ? `${endDay}T${endTime}:00.000Z` : null;
  const rangeValid =
    Boolean(reservedFrom && reservedTo) &&
    Date.parse(reservedTo!) > Date.parse(reservedFrom!);

  const canSubmit =
    Boolean(toolId && hasWindow) && rangeValid && !busySubmit;

  const submit = async () => {
    if (!canSubmit || !reservedFrom || !reservedTo) return;
    setBusySubmit(true);
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
      setRange({});
      setStartTime("00:00");
      setEndTime("23:59");
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
      setRange({
        from: parseISO(r.reservedFrom.slice(0, 10)),
        to: parseISO(r.reservedTo.slice(0, 10)),
      });
      setStartTime(r.reservedFrom.slice(11, 16));
      setEndTime(r.reservedTo.slice(11, 16));
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
    if (r.status === "reserved") {
      // No Deliver while the tool is in use / mid-handover on another
      // reservation (same stage or elsewhere).
      if (r.deliverable === false)
        return (
          <span className="text-xs text-muted-foreground">
            Araç şu an müsait değil
          </span>
        );
      return <Button size="sm" onClick={() => void act(r.id, "deliver")}>Deliver</Button>;
    }
    if (r.status === "delivering")
      return <Button size="sm" onClick={() => void act(r.id, "receive")}>Receive</Button>;
    // Return is allowed any time after receive (not only once the stage is
    // completed) — work with the tool may finish early.
    if (r.status === "received")
      return <Button size="sm" onClick={() => void act(r.id, "return")}>Return</Button>;
    if (r.status === "returning")
      return (
        <Button size="sm" onClick={() => void act(r.id, "receive-return")}>
          Receive return
        </Button>
      );
    return null;
  };

  // Without tools:read there is nothing to show — hide the whole panel
  // instead of rendering an empty skeleton.
  if (!canReadTools) return null;

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
                    r.status === "reserved" && r.deliverable === false ? (
                      <span className="text-xs text-muted-foreground">
                        Araç şu an müsait değil
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Scan QR to hand over
                      </span>
                    )
                  ) : null}
                  {canReserve && (
                    <>
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
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canReserve && (
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
                  setRange({});
                  setStartTime("00:00");
                  setEndTime("23:59");
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
                mode="range"
                selected={{ from: range.from, to: range.to }}
                onSelect={(sel) =>
                  setRange({ from: sel?.from, to: sel?.to })
                }
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
                Takvimden başlangıç ve bitiş gününü seçin; aşağıya başlangıç
                ve bitiş saatini girin. Araç bu aralıktaki TÜM saatlerde
                rezerve sayılır.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Başlangıç saati</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Bitiş saati</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {rangeValid
                    ? `${startDay} ${startTime} → ${endDay} ${endTime}`
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
      )}
    </div>
  );
}

