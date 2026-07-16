import { useInvalidate, useList, useNotification } from "@refinedev/core";
import { eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Can } from "@/components/can";
import { Badge } from "@/components/ui/badge";
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
import { axiosInstance } from "@/providers/axios";
import {
  DaySlotStrip,
  fmtWall,
  SLOT_MS,
  slotEndTime,
  slotRuns,
  slotToTime,
} from "./day-slot-strip";

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
  section: { id: string; locationId: string } | null;
  order: { orderNumber: string } | null;
}

/**
 * Reserve a section for this stage with SLOT-LEVEL precision: pick one or
 * more days on the calendar, then toggle individual half-hour boxes — the
 * same hours apply to every picked day (e.g. 09:00–12:00 across three days).
 * Each contiguous run per day is stored as its own reservation row; existing
 * rows of this stage are listed below and can be removed.
 */
export function StageReservation({
  stageId,
  orderId,
  windowStart,
  windowEnd,
  onChanged,
}: {
  stageId: string;
  orderId: string;
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
  const [days, setDays] = useState<string[]>([]);
  // Each picked day carries its OWN slot selection (different hours per day).
  const [slotsByDay, setSlotsByDay] = useState<Record<string, Set<number>>>(
    {},
  );
  const [busy, setBusy] = useState(false);

  const { result: sections } = useList<SectionOpt>({
    resource: "sections",
    filters: [{ field: "locationId", operator: "eq", value: locationId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(locationId) },
  });

  // This stage's own reservations (listed + removable below).
  const { result: mineRes, query: mineQuery } = useList<ReservationRow>({
    resource: "section-reservations",
    filters: [{ field: "stageId", operator: "eq", value: stageId }],
    sorters: [{ field: "startDate", order: "asc" }],
    pagination: { mode: "off" },
  });
  const mine = mineRes?.data ?? [];

  // Existing reservations for the chosen section (availability awareness).
  const { result: existing, query: existingQuery } = useList<ReservationRow>({
    resource: "section-reservations",
    filters: [{ field: "sectionId", operator: "eq", value: sectionId }],
    sorters: [{ field: "startDate", order: "asc" }],
    pagination: { mode: "off" },
  });
  const taken = existing?.data ?? [];

  // Busy calendar paint (day level; busy days stay SELECTABLE — hours differ).
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

  // Effective epoch range per existing reservation (own hours ?? full days).
  const takenRanges = useMemo(
    () =>
      taken.map((r) => ({
        from: r.startAt
          ? Date.parse(r.startAt)
          : Date.parse(`${r.startDate}T00:00:00.000Z`),
        to: r.endAt
          ? Date.parse(r.endAt)
          : Date.parse(`${r.endDate}T00:00:00.000Z`) + 24 * 60 * 60 * 1000,
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

  const canSubmit =
    Boolean(locationId && sectionId) && rangeCount > 0 && !busy;

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
      <Label className="text-sm font-medium">Section reservation</Label>

      {/* This stage's current reservations. */}
      {mine.length > 0 && (
        <ul className="space-y-1">
          {mine.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-xs">
              <Badge variant="outline">Reserved</Badge>
              <span>
                {fmtWall(r.startAt, r.startDate)} →{" "}
                {fmtWall(r.endAt, r.endDate)}
              </span>
              <Can perm="section-reservations:delete">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => void removeReservation(r.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </Can>
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
            disabled={!locationId}
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
        <div className="space-y-2">
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
            defaultMonth={windowStart ? parseISO(windowStart) : undefined}
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
            Takvimden bir veya birden fazla gün seçin; her günün saat kutuları
            AYRI ayrı seçilir.
          </p>
        </div>
      )}

      {/* Per-day half-hour boxes: each picked day gets its OWN grid. */}
      {sectionId && days.length > 0 && (
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
            Kutulara tek tek dokunarak seçin/bırakın — her gün için farklı
            saatler seçilebilir. Kırmızı kutular o gün dolu, alınamaz.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {rangeCount > 0
            ? `${days.length} gün · toplam ${rangeCount} saat aralığı = ${rangeCount} rezervasyon`
            : windowStart && windowEnd
              ? `Rezervasyon aşamanın tarih aralığında olmalı (${windowStart} → ${windowEnd}).`
              : "Gün(ler) ve saat kutularını seçin."}
        </span>
        <Button size="sm" disabled={!canSubmit} onClick={() => void reserve()}>
          {busy ? "Saving..." : "Reserve section"}
        </Button>
      </div>

      {taken.length > 0 && (
        <ul className="text-xs text-muted-foreground">
          {taken.map((r) => (
            <li key={r.id}>
              <Badge variant="outline" className="mr-1">
                {r.order?.orderNumber ?? "—"}
              </Badge>
              {fmtWall(r.startAt, r.startDate)} → {fmtWall(r.endAt, r.endDate)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
