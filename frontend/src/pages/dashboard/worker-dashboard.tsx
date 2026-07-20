import { useGetIdentity } from "@refinedev/core";
import {
  addDays,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  ClipboardList,
  Package,
  Workflow,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { KpiCard } from "@/components/refine-ui/kpi-card";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { axiosInstance } from "@/providers/axios";
import { cn } from "@/lib/utils";
import { CheckoutCards, useMyCheckouts } from "./my-checkouts";

interface Identity {
  id: string;
  name: string;
}

interface StageCard {
  id: string;
  name: string;
  sequence: number;
  status: string;
  projectId: string;
  projectName: string;
  orderId: string | null;
  orderNumber: string | null;
  processName: string | null;
  estimatedStartDate: string | null;
  estimatedCompletedDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface ResponsibilityStage {
  id: string;
  name: string;
  sequence: number;
  status: string;
  estimatedStartDate: string | null;
  estimatedCompletedDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  estimatedDurationHours: number | null;
  durationHours: number | null;
  workers: string[];
}

interface MyResponsibility {
  id: string;
  overallStatus: string;
  projectId: string | null;
  projectName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  orderItemId: string | null;
  orderItemName: string | null;
  completedStages: number;
  totalStages: number;
  stages: ResponsibilityStage[];
}

const STAGE_CHIP_TONE: Record<string, string> = {
  completed: "border-green-600/50 bg-green-500/10 text-green-500",
  in_progress: "border-blue-500/50 bg-blue-500/10 text-blue-400",
  pending: "border-border bg-muted/40 text-muted-foreground",
};

// Gantt band fill by stage status (mirrors the project timeline styling).
const GANTT_BAND: Record<string, string> = {
  completed: "bg-success/25 border-l-success",
  in_progress: "bg-info/30 border-l-info",
  pending: "bg-muted border-l-border",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const shortDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });

function toDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Effective bar range of a stage: actuals win over estimates; a missing end
 *  is derived from the duration when possible. */
function ganttRange(
  s: ResponsibilityStage,
): { start: Date; end: Date } | null {
  const start = toDate(s.startedAt) ?? toDate(s.estimatedStartDate);
  if (!start) return null;
  let end = toDate(s.completedAt) ?? toDate(s.estimatedCompletedDate);
  if (!end) {
    const hours = s.estimatedDurationHours ?? s.durationHours;
    if (hours) end = new Date(start.getTime() + hours * 3_600_000);
  }
  if (!end || end < start) end = start;
  return { start, end };
}

/**
 * Compact Gantt of one process's stages: one row per stage, bars scaled over
 * the process's own date span, weekly ticks + a "today" marker. Stages
 * without any date fall back to the chip row rendered by the caller.
 */
function ResponsibilityGantt({ stages }: { stages: ResponsibilityStage[] }) {
  const dated = stages
    .map((s) => ({ s, range: ganttRange(s) }))
    .filter((x): x is { s: ResponsibilityStage; range: { start: Date; end: Date } } =>
      Boolean(x.range),
    );
  if (dated.length === 0) return null;

  const minT = Math.min(...dated.map((x) => x.range.start.getTime()));
  let maxT = Math.max(
    ...dated.map((x) => x.range.end.getTime() + DAY_MS), // bar covers the end day
  );
  const span = Math.max(maxT - minT, 7 * DAY_MS);
  maxT = minT + span;

  const weekCount = Math.min(Math.ceil(span / (7 * DAY_MS)) + 1, 16);
  const weeks = Array.from({ length: weekCount }, (_, i) => {
    const t = minT + i * 7 * DAY_MS;
    return { leftPct: ((t - minT) / span) * 100, label: shortDate(t) };
  }).filter((w) => w.leftPct <= 97);

  const now = Date.now();
  const todayPct = now >= minT && now <= maxT ? ((now - minT) / span) * 100 : null;

  return (
    <div className="space-y-1">
      {/* Week ticks */}
      <div className="relative h-4" style={{ marginLeft: "11rem" }}>
        {weeks.map((w) => (
          <span
            key={w.label + w.leftPct}
            className="absolute top-0 -translate-x-1/2 text-[9px] text-muted-foreground"
            style={{ left: `${w.leftPct}%` }}
          >
            {w.label}
          </span>
        ))}
      </div>
      {dated.map(({ s, range }) => {
        const left = Math.max(
          ((range.start.getTime() - minT) / span) * 100,
          0,
        );
        const width = Math.min(
          Math.max(
            ((range.end.getTime() + DAY_MS - range.start.getTime()) / span) *
              100,
            2,
          ),
          100 - left,
        );
        const dateLabel = `${shortDate(range.start.getTime())} → ${shortDate(range.end.getTime())}`;
        const workerLabel = s.workers.length ? s.workers.join(", ") : "—";
        return (
          <div key={s.id} className="flex items-center gap-2">
            <span
              className="shrink-0"
              style={{ width: "10.5rem" }}
              title={`${s.name} · ${workerLabel}`}
            >
              <span className="block truncate text-[11px] font-medium text-foreground">
                {s.sequence}. {s.name}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {workerLabel}
              </span>
            </span>
            <div className="relative h-7 flex-1 overflow-hidden rounded bg-muted/30">
              {weeks.map((w) => (
                <span
                  key={w.leftPct}
                  className="absolute inset-y-0 border-l border-border/60"
                  style={{ left: `${w.leftPct}%` }}
                />
              ))}
              {todayPct != null && (
                <span
                  className="absolute inset-y-0 z-10 border-l-2 border-primary"
                  style={{ left: `${todayPct}%` }}
                  title="Bugün"
                />
              )}
              <div
                className={cn(
                  "absolute inset-y-0.5 flex items-center overflow-hidden rounded border-l-2 px-1.5",
                  GANTT_BAND[s.status] ?? GANTT_BAND.pending,
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${s.name}\n${dateLabel}\nDurum: ${s.status.replace(/_/g, " ")}\nÇalışanlar: ${workerLabel}`}
              >
                {width > 18 && (
                  <span className="truncate font-mono text-[10px] text-foreground/80">
                    {dateLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {/* Legend */}
      <div
        className="flex flex-wrap gap-3 pt-1 text-[10px] text-muted-foreground"
        style={{ marginLeft: "11rem" }}
      >
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-success/40" />
          Tamamlandı
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-info/50" />
          Devam ediyor
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted" />
          Bekliyor
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-0.5 bg-primary" />
          Bugün
        </span>
      </div>
    </div>
  );
}

/** Effective working window of a stage: actuals win over estimates. */
function stageRange(c: StageCard): { start: Date | null; end: Date | null } {
  const s = c.startedAt ?? c.estimatedStartDate;
  const e = c.completedAt ?? c.estimatedCompletedDate;
  return {
    start: s ? parseISO(s.slice(0, 10)) : null,
    end: e ? parseISO(e.slice(0, 10)) : null,
  };
}

/** Is the stage active on the given day (range covers it, or running)? */
function activeOn(c: StageCard, day: Date): boolean {
  const { start, end } = stageRange(c);
  if (start && end) return day >= start && day <= end;
  if (start && !end) return isSameDay(start, day) || (c.status === "in_progress" && day >= start);
  if (c.status === "in_progress") return true;
  return false;
}

function StageRow({ c }: { c: StageCard }) {
  const inner = (
    <div className="flex items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent/40">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {c.sequence}. {c.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {c.projectName}
          {c.orderNumber ? ` · ${c.orderNumber}` : ""}
          {c.processName ? ` · ${c.processName}` : ""}
        </span>
      </span>
      <StatusBadge label={String(c.status).replace(/_/g, " ")} />
    </div>
  );
  return c.orderId ? (
    <Link to={`/projects/${c.projectId}/orders/${c.orderId}`}>{inner}</Link>
  ) : (
    inner
  );
}

/**
 * Shop-floor worker dashboard: their own work calendar (week/month), today's
 * tasks, and everything currently checked out to them. Only self-scoped
 * endpoints are used, so nothing here can 403 for a plain member.
 */
export const WorkerDashboard = () => {
  const { data: identity } = useGetIdentity<Identity>();

  const [cards, setCards] = useState<StageCard[]>([]);
  const { stockItems, tools, products } = useMyCheckouts();
  const [responsibilities, setResponsibilities] = useState<MyResponsibility[]>(
    [],
  );
  // Cascading selection: project → order → order item → process. Each level
  // defaults to its first option; changing a level resets everything below.
  const [selProject, setSelProject] = useState<string | null>(null);
  const [selOrder, setSelOrder] = useState<string | null>(null);
  const [selItem, setSelItem] = useState<string | null>(null);
  const [selProcId, setSelProcId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    axiosInstance
      .get<{ cards: StageCard[] }>("/stage-board")
      .then((r) => mounted && setCards(r.data.cards ?? []))
      .catch(() => mounted && setCards([]));
    axiosInstance
      .get<MyResponsibility[]>("/my-work/responsibilities")
      .then((r) => mounted && setResponsibilities(r.data ?? []))
      .catch(() => mounted && setResponsibilities([]));
    return () => {
      mounted = false;
    };
  }, []);

  const today = useMemo(() => new Date(), []);
  const open = useMemo(
    () => cards.filter((c) => c.status !== "completed"),
    [cards],
  );
  const todayTasks = useMemo(
    () => open.filter((c) => activeOn(c, today)),
    [open, today],
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [today]);
  const weekTasks = useMemo(
    () => open.filter((c) => weekDays.some((d) => activeOn(c, d))),
    [open, weekDays],
  );

  // Every day any (open) stage covers — paints the month calendar.
  const busyDays = useMemo(() => {
    const out: Date[] = [];
    for (const c of open) {
      const { start, end } = stageRange(c);
      if (!start) continue;
      try {
        eachDayOfInterval({ start, end: end ?? start }).forEach((d) =>
          out.push(d),
        );
      } catch {
        /* malformed range */
      }
    }
    return out;
  }, [open]);

  const uniqueBy = <T,>(
    rows: MyResponsibility[],
    key: (p: MyResponsibility) => string | null,
    label: (p: MyResponsibility) => string,
  ): Array<{ id: string; label: string } & { _row?: T }> => {
    const out = new Map<string, { id: string; label: string }>();
    for (const r of rows) {
      const k = key(r);
      if (k && !out.has(k)) out.set(k, { id: k, label: label(r) });
    }
    return [...out.values()];
  };

  const projectOptions = useMemo(
    () =>
      uniqueBy(
        responsibilities,
        (p) => p.projectId,
        (p) => p.projectName ?? "—",
      ),
    [responsibilities],
  );
  const effProject =
    projectOptions.find((o) => o.id === selProject)?.id ??
    projectOptions[0]?.id ??
    null;

  const orderOptions = useMemo(
    () =>
      uniqueBy(
        responsibilities.filter((p) => p.projectId === effProject),
        (p) => p.orderId,
        (p) => p.orderNumber ?? "—",
      ),
    [responsibilities, effProject],
  );
  const effOrder =
    orderOptions.find((o) => o.id === selOrder)?.id ??
    orderOptions[0]?.id ??
    null;

  const itemOptions = useMemo(
    () =>
      uniqueBy(
        responsibilities.filter((p) => p.orderId === effOrder),
        (p) => p.orderItemId,
        (p) => p.orderItemName ?? "—",
      ),
    [responsibilities, effOrder],
  );
  const effItem =
    itemOptions.find((o) => o.id === selItem)?.id ?? itemOptions[0]?.id ?? null;

  const processOptions = useMemo(
    () => responsibilities.filter((p) => p.orderItemId === effItem),
    [responsibilities, effItem],
  );
  const selectedProc = useMemo(
    () =>
      processOptions.find((p) => p.id === selProcId) ??
      processOptions[0] ??
      null,
    [processOptions, selProcId],
  );
  const selectedPct = selectedProc && selectedProc.totalStages > 0
    ? Math.round(
        (selectedProc.completedStages / selectedProc.totalStages) * 100,
      )
    : 0;
  const selectedCounts = useMemo(
    () => ({
      completed:
        selectedProc?.stages.filter((s) => s.status === "completed").length ??
        0,
      inProgress:
        selectedProc?.stages.filter((s) => s.status === "in_progress")
          .length ?? 0,
      pending:
        selectedProc?.stages.filter((s) => s.status === "pending").length ?? 0,
    }),
    [selectedProc],
  );

  const [view, setView] = useState<"week" | "month">("week");
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const selectedTasks = useMemo(
    () => open.filter((c) => activeOn(c, selectedDay)),
    [open, selectedDay],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Work</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome{identity?.name ? `, ${identity.name}` : ""} — your schedule
          and everything checked out to you.
        </p>
      </div>

      {/* Summary strip */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Bugünün İşleri"
          value={todayTasks.length}
          icon={ClipboardList}
          tone="primary"
          hint="Bugün aktif aşamalar"
        />
        <KpiCard
          label="Bu Hafta"
          value={weekTasks.length}
          icon={CalendarDays}
          tone="primary"
          hint="Bu haftaki aşamalar"
        />
        <KpiCard
          label="Üzerimdeki Malzeme"
          value={stockItems.length}
          icon={Package}
          tone="primary"
          hint="Teslim aldıklarım"
        />
        <KpiCard
          label="Üzerimdeki Araç"
          value={tools.length}
          icon={Wrench}
          tone="primary"
          hint="Teslim aldıklarım"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                İş Takvimim
              </span>
              <span className="flex gap-1">
                <Button
                  size="sm"
                  variant={view === "week" ? "default" : "outline"}
                  onClick={() => setView("week")}
                >
                  Hafta
                </Button>
                <Button
                  size="sm"
                  variant={view === "month" ? "default" : "outline"}
                  onClick={() => setView("month")}
                >
                  Ay
                </Button>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {view === "week" ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
                {weekDays.map((d) => {
                  const tasks = open.filter((c) => activeOn(c, d));
                  const isToday = isSameDay(d, today);
                  return (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "flex min-h-24 flex-col gap-1 rounded-md border p-2",
                        isToday && "border-primary bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isToday ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {format(d, "EEE dd.MM")}
                      </span>
                      {tasks.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground">
                          —
                        </span>
                      ) : (
                        tasks.map((c) => (
                          <Link
                            key={c.id}
                            to={
                              c.orderId
                                ? `/projects/${c.projectId}/orders/${c.orderId}`
                                : `/projects/${c.projectId}`
                            }
                            className="truncate rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary hover:bg-primary/25"
                            title={`${c.name} · ${c.projectName}`}
                          >
                            {c.name}
                          </Link>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-4 md:flex-row">
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={(d) => d && setSelectedDay(d)}
                  modifiers={{ busy: busyDays }}
                  modifiersClassNames={{
                    busy: "bg-primary/20 text-primary font-semibold",
                  }}
                  className="rounded-md border"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm font-medium">
                    {format(selectedDay, "dd.MM.yyyy")} —{" "}
                    {selectedTasks.length
                      ? `${selectedTasks.length} iş`
                      : "iş yok"}
                  </p>
                  {selectedTasks.map((c) => (
                    <StageRow key={c.id} c={c} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" />
              Bugünün İşleri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bugün için planlanmış iş yok.
              </p>
            ) : (
              todayTasks.map((c) => <StageRow key={c.id} c={c} />)
            )}
          </CardContent>
        </Card>
      </div>

      {/* Processes the user is responsible for — pick one from the dropdown,
          see a timeline-page-style summary + a stage Gantt (workers, dates,
          status colors). Only draft/in_progress processes arrive from the
          backend. */}
      {responsibilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="size-4 text-primary" />
              Sorumlu Olduğum Prosesler ({responsibilities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Cascading pickers: project → order → item → process. */}
            <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Proje</span>
                <Select
                  value={effProject ?? ""}
                  onValueChange={(v) => {
                    setSelProject(v);
                    setSelOrder(null);
                    setSelItem(null);
                    setSelProcId(null);
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Proje seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Sipariş</span>
                <Select
                  value={effOrder ?? ""}
                  onValueChange={(v) => {
                    setSelOrder(v);
                    setSelItem(null);
                    setSelProcId(null);
                  }}
                  disabled={!effProject}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue
                      placeholder={effProject ? "Sipariş seçin" : "Önce proje"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {orderOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Kalem</span>
                <Select
                  value={effItem ?? ""}
                  onValueChange={(v) => {
                    setSelItem(v);
                    setSelProcId(null);
                  }}
                  disabled={!effOrder}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue
                      placeholder={effOrder ? "Kalem seçin" : "Önce sipariş"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {itemOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Proses</span>
                <Select
                  value={selectedProc?.id ?? ""}
                  onValueChange={setSelProcId}
                  disabled={!effItem}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue
                      placeholder={effItem ? "Proses seçin" : "Önce kalem"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {processOptions.map((p, i) => (
                      <SelectItem key={p.id} value={p.id}>
                        Proses {i + 1} — {String(p.overallStatus).replace(/_/g, " ")}{" "}
                        ({p.completedStages}/{p.totalStages})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedProc && (
              <div className="space-y-3">
                {/* Timeline-style summary strip */}
                <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/20 p-3 text-sm">
                  <span className="min-w-0 font-medium">
                    {selectedProc.projectName ?? "—"}
                    {selectedProc.orderNumber
                      ? ` · ${selectedProc.orderNumber}`
                      : ""}
                    {selectedProc.orderItemName
                      ? ` · ${selectedProc.orderItemName}`
                      : ""}
                  </span>
                  <StatusBadge
                    label={String(selectedProc.overallStatus).replace(/_/g, " ")}
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    {selectedProc.completedStages}/{selectedProc.totalStages}{" "}
                    aşama · %{selectedPct}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="text-success">
                      {selectedCounts.completed} tamamlandı
                    </span>
                    <span className="text-info">
                      {selectedCounts.inProgress} devam
                    </span>
                    <span>{selectedCounts.pending} bekliyor</span>
                  </span>
                  {selectedProc.projectId && selectedProc.orderId && (
                    <Button asChild size="sm" variant="outline" className="ml-auto">
                      <Link
                        to={`/projects/${selectedProc.projectId}/orders/${selectedProc.orderId}`}
                      >
                        Siparişe git
                      </Link>
                    </Button>
                  )}
                </div>
                {/* Overall progress */}
                <div className="h-2 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary transition-all"
                    style={{ width: `${selectedPct}%` }}
                  />
                </div>
                {/* Stage Gantt (workers + dates + status colors); chip
                    fallback when no stage carries a date. */}
                {selectedProc.stages.some((s) => ganttRange(s)) ? (
                  <ResponsibilityGantt stages={selectedProc.stages} />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProc.stages.map((s) => (
                      <span
                        key={s.id}
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[11px]",
                          STAGE_CHIP_TONE[s.status] ?? STAGE_CHIP_TONE.pending,
                        )}
                        title={`${String(s.status).replace(/_/g, " ")} · ${
                          s.workers.length ? s.workers.join(", ") : "—"
                        }`}
                      >
                        {s.sequence}. {s.name}
                      </span>
                    ))}
                    {selectedProc.stages.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        Henüz aşama yok.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checked-out items */}
      <CheckoutCards stockItems={stockItems} tools={tools} products={products} />
    </div>
  );
};
