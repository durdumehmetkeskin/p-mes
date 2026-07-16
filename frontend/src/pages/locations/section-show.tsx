import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";

interface ScheduleStage {
  id: string;
  name: string;
  sequence: number;
  status: string;
  processId: string;
  processName: string | null;
  orderItemName: string | null;
  /** Comma-joined names of the stage's workers. */
  workerNames: string | null;
  start: string | null;
  end: string | null;
  estimatedDurationHours: number | null;
  durationHours: number | null;
}
interface ScheduleReservation {
  id: string;
  startDate: string;
  endDate: string;
  note: string | null;
  orderId: string;
  orderNumber: string;
  orderName: string | null;
  orderStatus: string | null;
  orderDueDate: string | null;
  projectId: string | null;
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
    locationId: string;
    locationCode: string | null;
    locationName: string | null;
  };
  reservations: ScheduleReservation[];
}

const DAY = 86_400_000;

/** Bar palette per stage status: [bar, progress] — tuned for the dark theme. */
const STAGE_COLORS: Record<string, [string, string]> = {
  completed: ["#10b981", "#047857"],
  in_progress: ["#3b82f6", "#1d4ed8"],
  pending: ["#64748b", "#475569"],
};
const RESERVATION_COLORS: [string, string] = ["#d97706", "#92400e"];

/** Extra info per Gantt task, for the tooltip (keyed by task id). */
interface TaskMeta {
  kind: "reservation" | "stage";
  project: string;
  order: string;
  process?: string;
  orderItem?: string;
  responsible?: string;
  status?: string;
  duration?: string;
  note?: string;
  range: string;
}

function dateOnly(v: string): Date {
  return new Date(`${v}T00:00:00`);
}

function fmtDate(v: Date | string | null): string {
  if (!v) return "—";
  return (v instanceof Date ? v : new Date(v)).toLocaleDateString();
}

/** In-progress bars show real elapsed time as the progress fill. */
function stageProgress(st: ScheduleStage, start: Date, end: Date): number {
  if (st.status === "completed") return 100;
  if (st.status !== "in_progress") return 0;
  const now = Date.now();
  const span = end.getTime() - start.getTime();
  if (span <= 0) return 50;
  return Math.min(95, Math.max(5, Math.round(((now - start.getTime()) / span) * 100)));
}

function hoursLabel(st: ScheduleStage): string {
  if (st.durationHours != null) return `${st.durationHours}h actual`;
  if (st.estimatedDurationHours != null)
    return `${st.estimatedDurationHours}h est.`;
  return "—";
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

const VIEW_MODES: Array<{ mode: ViewMode; label: string }> = [
  { mode: ViewMode.Day, label: "Day" },
  { mode: ViewMode.Week, label: "Week" },
  { mode: ViewMode.Month, label: "Month" },
];

export const SectionShow = () => {
  const { id: locationId, sectionId } = useParams();
  const [data, setData] = useState<SectionSchedule | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<ViewMode>(ViewMode.Week);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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

  // Reservation groups become "project" rows; their order's stages become
  // child task rows chained by sequence within the same process.
  const { tasks, meta, unscheduled } = useMemo(() => {
    const tasks: Task[] = [];
    const meta = new Map<string, TaskMeta>();
    let unscheduled = 0;
    let displayOrder = 0;

    for (const r of reservations) {
      const resId = `res-${r.id}`;
      const start = dateOnly(r.startDate);
      const end = new Date(dateOnly(r.endDate).getTime() + DAY);
      const label = `${r.orderNumber}${r.projectName ? ` · ${r.projectName}` : ""}`;
      const dated = r.stages.filter((st) => st.start);
      unscheduled += r.stages.length - dated.length;
      const done = r.stages.filter((st) => st.status === "completed").length;

      tasks.push({
        id: resId,
        type: "project",
        name: label,
        start,
        end,
        progress: r.stages.length
          ? Math.round((done / r.stages.length) * 100)
          : 0,
        hideChildren: collapsed.has(resId),
        displayOrder: displayOrder++,
        isDisabled: true,
        styles: {
          backgroundColor: RESERVATION_COLORS[0],
          backgroundSelectedColor: RESERVATION_COLORS[0],
          progressColor: RESERVATION_COLORS[1],
          progressSelectedColor: RESERVATION_COLORS[1],
        },
      });
      meta.set(resId, {
        kind: "reservation",
        project: r.projectName ?? "—",
        order: `${r.orderNumber}${r.orderName ? ` (${r.orderName})` : ""}`,
        status: r.orderStatus ?? undefined,
        note: r.note ?? undefined,
        range: `${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}`,
      });

      // Chain stages within the same process so dependency arrows mirror the
      // sequence, like the library demo.
      const byProcess = new Map<string, string>();
      for (const st of dated.sort(
        (a, b) => (a.start ?? "").localeCompare(b.start ?? ""),
      )) {
        const sStart = new Date(st.start as string);
        let sEnd = st.end ? new Date(st.end) : new Date(sStart.getTime() + DAY);
        if (sEnd.getTime() <= sStart.getTime())
          sEnd = new Date(sStart.getTime() + DAY);
        const [bg, fg] = STAGE_COLORS[st.status] ?? STAGE_COLORS.pending;
        const taskId = `stage-${st.id}`;
        const prev = byProcess.get(st.processId);
        byProcess.set(st.processId, taskId);

        tasks.push({
          id: taskId,
          type: "task",
          name: `${st.name}${st.workerNames ? ` · ${st.workerNames}` : ""}`,
          start: sStart,
          end: sEnd,
          progress: stageProgress(st, sStart, sEnd),
          project: resId,
          dependencies: prev ? [prev] : undefined,
          displayOrder: displayOrder++,
          isDisabled: true,
          styles: {
            backgroundColor: bg,
            backgroundSelectedColor: bg,
            progressColor: fg,
            progressSelectedColor: fg,
          },
        });
        meta.set(taskId, {
          kind: "stage",
          project: r.projectName ?? "—",
          order: r.orderNumber,
          process: st.processName ?? "—",
          orderItem: st.orderItemName ?? undefined,
          responsible: st.workerNames ?? "—",
          status: st.status,
          duration: hoursLabel(st),
          range: `${fmtDate(st.start)} → ${fmtDate(st.end)}`,
        });
      }
    }
    return { tasks, meta, unscheduled };
  }, [reservations, collapsed]);

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

  const section = data?.section;

  const TooltipContent = useMemo(
    () =>
      function SectionGanttTooltip({ task }: { task: Task }) {
        const m = meta.get(task.id);
        if (!m) return null;
        return (
          <div className="rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md">
            <p className="font-semibold">
              {m.kind === "reservation" ? "Reservation" : "Stage"} ·{" "}
              {task.name}
            </p>
            <p>Project: {m.project}</p>
            <p>Order: {m.order}</p>
            {m.orderItem && <p>Order item: {m.orderItem}</p>}
            {m.process && <p>Process: {m.process}</p>}
            {m.responsible && <p>Responsible: {m.responsible}</p>}
            <p>{m.range}</p>
            {m.status && <p>Status: {m.status.replace(/_/g, " ")}</p>}
            {m.duration && <p>Duration: {m.duration}</p>}
            {m.note && <p>Note: {m.note}</p>}
          </div>
        );
      },
    [meta],
  );

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

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span>Reservation timeline</span>
            <span className="flex items-center gap-2">
              {VIEW_MODES.map((v) => (
                <Button
                  key={v.label}
                  size="sm"
                  variant={view === v.mode ? "default" : "outline"}
                  onClick={() => setView(v.mode)}
                >
                  {v.label}
                </Button>
              ))}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-amber-600" />
              Reservation (order hold)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-slate-500" />
              Pending
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-blue-500" />
              In progress
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-emerald-500" />
              Completed
            </span>
            {unscheduled > 0 && (
              <span className="ml-auto">
                {unscheduled} stage{unscheduled === 1 ? "" : "s"} without dates
                not shown
              </span>
            )}
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : loading && !data ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : !tasks.length ? (
            <p className="text-sm text-muted-foreground">
              No reservations for this section
              {from || to ? " in the selected window" : ""}. Reserve it for an
              order from the location page.
            </p>
          ) : (
            // .section-gantt re-skins the library's light CSS to the app theme
            // (see App.css).
            <div className="section-gantt overflow-x-auto rounded-md border bg-card">
              <Gantt
                tasks={tasks}
                viewMode={view}
                locale="en"
                listCellWidth="180px"
                columnWidth={
                  view === ViewMode.Month ? 300 : view === ViewMode.Week ? 250 : 65
                }
                barCornerRadius={4}
                fontSize="12px"
                fontFamily="Inter, sans-serif"
                arrowColor="#9ba1b4"
                arrowIndent={16}
                todayColor="rgba(173, 198, 255, 0.12)"
                TooltipContent={TooltipContent}
                onExpanderClick={(task) =>
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(task.id)) next.delete(task.id);
                    else next.add(task.id);
                    return next;
                  })
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Amber group bars are this section's reservations (which order holds the
        section and when); their fill shows how many of the order's stages are
        completed. Child bars are the reserved order's stages — arrows follow
        the process sequence, in-progress fill shows elapsed time. Hover any
        bar for project, order, process, stage, responsible and duration.
      </p>
    </div>
  );
};
