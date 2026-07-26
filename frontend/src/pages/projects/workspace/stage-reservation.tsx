import { useInvalidate, useList, useNotification } from "@refinedev/core";
import { eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
import { CalendarClock, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { axiosInstance } from "@/providers/axios";
import { fmtWall } from "./day-slot-strip";

interface LocationOpt {
  id: string;
  code: string;
  name: string;
}
interface SectionOpt {
  id: string;
  code: string;
  name: string;
}
interface ReservationRow {
  id: string;
  stageId: string | null;
  startDate: string;
  endDate: string;
  startAt: string | null;
  endAt: string | null;
  sectionId: string;
  section: { id: string; locationId: string; code?: string } | null;
  order: { orderNumber: string } | null;
}

/**
 * Section reservation for this stage — SAME structure as the tool reservation
 * block: pick location + section, a start/end day on the calendar (range) and
 * a start/end time. The whole continuous span is stored as ONE reservation
 * row (backend composes startDate+startTime → endDate+endTime). Existing rows
 * are listed, re-datable and removable.
 */
export function StageReservation({
  stageId,
  orderId,
  windowStart,
  windowEnd,
  canManage = false,
  onChanged,
}: {
  stageId: string;
  orderId: string;
  /** Process responsible or admin — may also manage reservations without
   *  the section-reservations:* keys (backend mirrors). */
  canManage?: boolean;
  /** Stage date window (actuals falling back to estimates). When defined,
   *  the reservation must lie inside it (backend enforces too). */
  windowStart?: string | null;
  windowEnd?: string | null;
  onChanged: () => void;
}) {
  const invalidate = useInvalidate();
  const { open: notify } = useNotification();

  const { result: locations } = useList<LocationOpt>({
    resource: "locations",
    pagination: { mode: "off" },
  });

  const [locationId, setLocationId] = useState("");
  const [sectionId, setSectionId] = useState("");
  // null = creating; a reservation id = re-dating that reservation.
  const [editId, setEditId] = useState<string | null>(null);
  // ONE continuous span: a date range + a start and an end time.
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [busy, setBusy] = useState(false);

  const { result: sections } = useList<SectionOpt>({
    resource: "sections",
    filters: [{ field: "locationId", operator: "eq", value: locationId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(locationId) },
  });

  // This stage's own reservations (listed + re-datable/removable below).
  const { result: mineRes, query: mineQuery } = useList<ReservationRow>({
    resource: "section-reservations",
    filters: [{ field: "stageId", operator: "eq", value: stageId }],
    sorters: [{ field: "startDate", order: "asc" }],
    pagination: { mode: "off" },
  });
  const mine = mineRes?.data ?? [];

  // Existing reservations for the chosen section (availability awareness) —
  // only the row being re-dated is excluded.
  const { result: existing, query: existingQuery } = useList<ReservationRow>({
    resource: "section-reservations",
    filters: [{ field: "sectionId", operator: "eq", value: sectionId }],
    sorters: [{ field: "startDate", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(sectionId), retry: false },
    errorNotification: false,
  });
  const taken = useMemo(
    () => (existing?.data ?? []).filter((r) => r.id !== editId),
    [existing?.data, editId],
  );

  // Day-level paint (busy days stay SELECTABLE — hours may differ).
  const reservedDays = useMemo(() => {
    const out: Date[] = [];
    for (const r of taken) {
      try {
        eachDayOfInterval({
          start: parseISO(r.startDate),
          end: parseISO(r.endDate),
        }).forEach((d) => out.push(d));
      } catch {
        /* ignore malformed dates */
      }
    }
    return out;
  }, [taken]);
  const isAvailable = (day: Date) =>
    !reservedDays.some((d) => isSameDay(d, day));

  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const startDay = range.from ? format(range.from, "yyyy-MM-dd") : null;
  const endDay = range.to ? format(range.to, "yyyy-MM-dd") : startDay;
  const reservedFrom =
    startDay && TIME_RE.test(startTime)
      ? Date.parse(`${startDay}T${startTime}:00.000Z`)
      : Number.NaN;
  const reservedTo =
    endDay && TIME_RE.test(endTime)
      ? Date.parse(`${endDay}T${endTime}:00.000Z`)
      : Number.NaN;
  const rangeValid =
    Number.isFinite(reservedFrom) &&
    Number.isFinite(reservedTo) &&
    reservedTo > reservedFrom;

  const canSubmit = Boolean(sectionId) && rangeValid && !busy;

  const resetForm = () => {
    setEditId(null);
    setRange({});
    setStartTime("00:00");
    setEndTime("23:59");
  };

  const submit = async () => {
    if (!canSubmit || !startDay || !endDay) return;
    setBusy(true);
    try {
      if (editId) {
        await axiosInstance.patch(`/section-reservations/${editId}`, {
          startDate: startDay,
          endDate: endDay,
          startTime,
          endTime,
        });
      } else {
        await axiosInstance.post("/section-reservations", {
          sectionId,
          orderId,
          stageId,
          startDate: startDay,
          endDate: endDay,
          startTime,
          endTime,
        });
      }
      resetForm();
      invalidate({ resource: "section-reservations", invalidates: ["list"] });
      await Promise.all([mineQuery.refetch(), existingQuery.refetch()]);
      onChanged();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Rezervasyon başarısız";
      notify?.({ type: "error", message: String(msg) });
    } finally {
      setBusy(false);
    }
  };

  // Re-date an existing row: keep its section, prefill range + times.
  const startEdit = (r: ReservationRow) => {
    setEditId(r.id);
    if (r.section?.locationId) setLocationId(r.section.locationId);
    setSectionId(r.sectionId);
    setRange({ from: parseISO(r.startDate), to: parseISO(r.endDate) });
    setStartTime(r.startAt ? r.startAt.slice(11, 16) : "00:00");
    setEndTime(r.endAt ? r.endAt.slice(11, 16) : "23:59");
  };

  const removeReservation = async (id: string) => {
    try {
      await axiosInstance.delete(`/section-reservations/${id}`);
      invalidate({ resource: "section-reservations", invalidates: ["list"] });
      await Promise.all([mineQuery.refetch(), existingQuery.refetch()]);
      onChanged();
    } catch {
      notify?.({ type: "error", message: "Rezervasyon silinemedi" });
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
          {editId ? "Re-date reservation" : "Section reservation"}
        </Label>
        {editId && (
          <Button size="sm" variant="ghost" onClick={resetForm}>
            Cancel edit
          </Button>
        )}
      </div>

      {/* This stage's current reservations. */}
      {mine.length > 0 && (
        <ul className="space-y-1">
          {mine.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-xs">
              <Badge variant="outline">
                {r.section?.code ?? "Reserved"}
              </Badge>
              <span>
                {fmtWall(r.startAt, r.startDate)} →{" "}
                {fmtWall(r.endAt, r.endDate)}
              </span>
              {canManage && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Re-date reservation"
                    onClick={() => startEdit(r)}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => void removeReservation(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label className="text-xs">Location</Label>
          <Select
            value={locationId}
            onValueChange={(v) => {
              setLocationId(v);
              setSectionId("");
            }}
            disabled={Boolean(editId)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {(locations?.data ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.code} · {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs">Section</Label>
          <Select
            value={sectionId}
            onValueChange={setSectionId}
            disabled={!locationId || Boolean(editId)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={locationId ? "Select section" : "Pick location first"}
              />
            </SelectTrigger>
            <SelectContent>
              {(sections?.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {sectionId && (
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
            onSelect={(sel) => setRange({ from: sel?.from, to: sel?.to })}
            defaultMonth={
              range.from ?? (windowStart ? parseISO(windowStart) : undefined)
            }
            disabled={
              windowStart && windowEnd
                ? [
                    { before: parseISO(windowStart) },
                    { after: parseISO(windowEnd) },
                  ]
                : undefined
            }
            modifiers={{ reserved: reservedDays, available: isAvailable }}
            modifiersClassNames={{
              reserved: "bg-red-500/60 text-white",
              available: "bg-green-100 text-green-900",
            }}
            className="rounded-md border"
          />
          <p className="text-[10px] text-muted-foreground">
            Takvimden başlangıç ve bitiş gününü seçin; aşağıya başlangıç ve
            bitiş saatini girin. Bölüm bu aralıktaki TÜM saatlerde rezerve
            sayılır.
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
                : windowStart && windowEnd
                  ? `Rezervasyon aşamanın tarih aralığında olmalı (${windowStart} → ${windowEnd}).`
                  : "Takvimden gün(ler) seçin ve saatleri girin."}
            </span>
            <Button size="sm" disabled={!canSubmit} onClick={() => void submit()}>
              {busy ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : editId ? (
                "Update reservation"
              ) : (
                "Reserve section"
              )}
            </Button>
          </div>

          {taken.length > 0 && (
            <ul className="text-xs text-muted-foreground">
              {taken.map((r) => (
                <li key={r.id}>
                  <Badge variant="outline" className="mr-1">
                    {r.order?.orderNumber ?? "—"}
                  </Badge>
                  {fmtWall(r.startAt, r.startDate)} →{" "}
                  {fmtWall(r.endAt, r.endDate)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
