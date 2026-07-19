import {
  CalendarClock,
  CalendarOff,
  GanttChartSquare,
  Percent,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { KpiCard } from "@/components/refine-ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";
import {
  WorkCalendarView,
  type ScheduleReservation,
} from "./schedule-calendar";

interface SectionSchedule {
  section: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    locationId: string;
    locationCode: string | null;
    locationName: string | null;
  };
  reservations: ScheduleReservation[];
}

const DAY = 86_400_000;

function dateOnly(v: string): Date {
  return new Date(`${v}T00:00:00`);
}

/** Merge possibly-overlapping [start, end) intervals. */
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

export const SectionShow = () => {
  const { id: locationId, sectionId } = useParams();
  const [data, setData] = useState<SectionSchedule | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId) return;
    setLoading(true);
    setError(null);
    axiosInstance
      .get<SectionSchedule>(`/sections/${sectionId}/schedule`, {
        params: { from: from || undefined, to: to || undefined },
      })
      .then(({ data }) => setData(data))
      .catch(() =>
        setError(
          "Could not load the section schedule (needs Section Reservations: Read).",
        ),
      )
      .finally(() => setLoading(false));
  }, [sectionId, from, to]);

  const reservations = useMemo(() => data?.reservations ?? [], [data]);
  const section = data?.section;

  // The section-scoped feed carries no per-row section — inject this one so
  // the shared work calendar can group/label its hour grid.
  const calReservations = useMemo(
    () =>
      section
        ? reservations.map((r) => ({
            ...r,
            section: { id: section.id, code: section.code, name: section.name },
          }))
        : reservations,
    [reservations, section],
  );

  // Busy/free arithmetic over the chosen window (else the data domain).
  const busySpans = useMemo(
    () =>
      mergeIntervals(
        reservations.map((r) => [
          dateOnly(r.startDate).getTime(),
          dateOnly(r.endDate).getTime() + DAY,
        ]),
      ),
    [reservations],
  );
  const [winStart, winEnd] = useMemo((): [number, number] => {
    if (busySpans.length === 0) return [0, 0];
    const lo = Math.min(...busySpans.map(([s]) => s));
    const hi = Math.max(...busySpans.map(([, e]) => e));
    return [
      from ? dateOnly(from).getTime() : lo,
      to ? dateOnly(to).getTime() + DAY : hi,
    ];
  }, [busySpans, from, to]);
  const busyDays = useMemo(() => {
    const msBusy = busySpans.reduce(
      (acc, [s, e]) =>
        acc + Math.max(0, Math.min(e, winEnd) - Math.max(s, winStart)),
      0,
    );
    return Math.round(msBusy / DAY);
  }, [busySpans, winStart, winEnd]);
  const windowDays = Math.max(1, Math.round((winEnd - winStart) / DAY));
  const freeDays = Math.max(0, windowDays - busyDays);
  const utilization = busySpans.length
    ? Math.round((busyDays / windowDays) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/locations/${locationId}`}>
              ← {section?.locationCode ?? "Location"}
            </Link>
          </Button>
          {section ? (
            <h1 className="flex items-center gap-2 text-xl font-bold">
              {section.code} · {section.name}
              <StatusBadge
                tone={section.isActive ? "success" : "neutral"}
                label={section.isActive ? "Active" : "Inactive"}
              />
            </h1>
          ) : (
            <Skeleton className="h-6 w-48" />
          )}
        </div>
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-40"
            />
          </div>
        </div>
      </div>

      {section?.description && (
        <p className="text-sm text-muted-foreground">{section.description}</p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Reservations"
          value={String(reservations.length)}
          icon={GanttChartSquare}
        />
        <KpiCard
          label="Busy days"
          value={String(busyDays)}
          icon={CalendarClock}
          hint={`of ${windowDays} in window`}
        />
        <KpiCard label="Free days" value={String(freeDays)} icon={CalendarOff} />
        <KpiCard label="Utilization" value={`${utilization}%`} icon={Percent} />
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : (
        <WorkCalendarView
          reservations={calReservations}
          sections={
            section
              ? [{ id: section.id, code: section.code, name: section.name }]
              : []
          }
        />
      )}

      <p className="text-xs text-muted-foreground">
        Days are colored by the linked stage's status (amber = reserved, blue =
        running, green = completed). Pick a day to see its half-hour occupancy
        grid — red slots are taken, green slots are free — and which project /
        order / order item / stage holds each busy window.
      </p>
    </div>
  );
};
