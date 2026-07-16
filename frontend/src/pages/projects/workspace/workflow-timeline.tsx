import { useList } from "@refinedev/core";
import {
  Activity,
  CircleDashed,
  GanttChartSquare,
  Layers,
  ListChecks,
} from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router";

import { KpiCard } from "@/components/refine-ui/kpi-card";
import { StatusBadge, type StatusTone } from "@/components/refine-ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProjectContext } from "./project-workspace";
import type { StageData } from "./stage-detail-dialog";

interface OrderRow {
  id: string;
  orderNumber: string;
  name: string | null;
}

interface ProcessRow {
  id: string;
  category: { id: string; name: string } | null;
  overallStatus: string;
  responsibleUser: { id: string; name: string } | null;
  stages: StageData[];
}

const DAY = 86_400_000;

const STAGE_TONE: Record<string, StatusTone> = {
  completed: "success",
  in_progress: "info",
  pending: "neutral",
};

// A stage band's fill/border by status (translucent, control-room style).
const BAND_CLASS: Record<string, string> = {
  completed: "bg-success/15 border-l-success",
  in_progress: "bg-info/20 border-l-info",
  pending: "bg-muted border-l-border",
};

function toDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function stageStart(s: StageData): Date | null {
  return toDate(s.estimatedStartDate) ?? toDate(s.startedAt);
}

function stageEnd(s: StageData): Date | null {
  const end = toDate(s.estimatedCompletedDate) ?? toDate(s.completedAt);
  if (end) return end;
  const start = stageStart(s);
  const hours = s.estimatedDurationHours ?? s.durationHours;
  if (start && hours) return new Date(start.getTime() + hours * 3_600_000);
  return null;
}

const shortDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

interface FlatStage {
  stage: StageData;
  process: ProcessRow;
  start: Date | null;
  end: Date | null;
}

export const ProjectWorkflowTimeline = () => {
  const { projectId } = useOutletContext<ProjectContext>();

  const { result: ordersRes } = useList<OrderRow>({
    resource: "orders",
    filters: [{ field: "projectId", operator: "eq", value: projectId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(projectId) },
  });
  const orders = ordersRes?.data ?? [];

  const [picked, setPicked] = useState("");
  const activeOrderId = picked || orders[0]?.id || "";

  const { result: procRes } = useList<ProcessRow>({
    resource: "processes",
    filters: [{ field: "orderId", operator: "eq", value: activeOrderId }],
    sorters: [{ field: "createdAt", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(activeOrderId) },
  });
  const processes = procRes?.data ?? [];

  const flat: FlatStage[] = processes.flatMap((process) =>
    [...process.stages]
      .sort((a, b) => a.sequence - b.sequence)
      .map((stage) => ({
        stage,
        process,
        start: stageStart(stage),
        end: stageEnd(stage),
      })),
  );

  const totalStages = flat.length;
  const completed = flat.filter((f) => f.stage.status === "completed").length;
  const active = flat.filter((f) => f.stage.status === "in_progress").length;
  const pending = flat.filter((f) => f.stage.status === "pending").length;
  const progress = totalStages ? Math.round((completed / totalStages) * 100) : 0;

  // Timeline scale: use dated stages when available, otherwise fall back to a
  // duration-weighted sequence so the timeline still reads left-to-right
  // without inventing precise dates.
  const dated = flat.filter((f) => f.start && f.end);
  const hasDates = dated.length > 0;

  let minT = 0;
  let maxT = 0;
  let weeks: { leftPct: number; label: string }[] = [];
  if (hasDates) {
    minT = Math.min(...dated.map((f) => f.start!.getTime()));
    maxT = Math.max(...dated.map((f) => f.end!.getTime()));
    const span = Math.max(maxT - minT, 7 * DAY);
    maxT = minT + span;
    const weekCount = Math.min(Math.ceil(span / (7 * DAY)), 16);
    weeks = Array.from({ length: weekCount }, (_, i) => {
      const t = minT + i * 7 * DAY;
      return { leftPct: ((t - minT) / span) * 100, label: shortDate(t) };
    });
  }

  const span = Math.max(maxT - minT, 1);

  // Sequence fallback: weight each stage by duration (or 1) and lay them end-to-end.
  const seqWeights = flat.map(
    (f) => f.stage.estimatedDurationHours ?? f.stage.durationHours ?? 1,
  );
  const seqTotal = seqWeights.reduce((s, w) => s + (w || 1), 0) || 1;
  const seqOffsets: number[] = [];
  seqWeights.reduce((acc, w, i) => {
    seqOffsets[i] = (acc / seqTotal) * 100;
    return acc + (w || 1);
  }, 0);

  function band(f: FlatStage, index: number): { left: number; width: number } | null {
    if (hasDates) {
      if (!f.start || !f.end) return null;
      const left = ((f.start.getTime() - minT) / span) * 100;
      const width = Math.max(((f.end.getTime() - f.start.getTime()) / span) * 100, 3);
      return { left: Math.max(left, 0), width: Math.min(width, 100 - left) };
    }
    const left = seqOffsets[index];
    const width = Math.max(((seqWeights[index] || 1) / seqTotal) * 100 - 1, 4);
    return { left, width };
  }

  // Resource allocation: load per worker across the order's stages.
  const loadByUser = new Map<string, { name: string; count: number }>();
  for (const f of flat) {
    for (const u of f.stage.workers ?? []) {
      const entry = loadByUser.get(u.id) ?? { name: u.name, count: 0 };
      entry.count += 1;
      loadByUser.set(u.id, entry);
    }
  }
  const resources = [...loadByUser.values()].sort((a, b) => b.count - a.count);
  const maxLoad = Math.max(1, ...resources.map((r) => r.count));

  let bandIndex = -1;

  return (
    <div className="flex flex-col gap-4">
      {/* Header + order picker */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GanttChartSquare className="size-5 text-primary" />
          <h2 className="text-base font-semibold">Workflow Orchestration</h2>
        </div>
        {orders.length > 0 && (
          <Select value={activeOrderId} onValueChange={setPicked}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select an order" />
            </SelectTrigger>
            <SelectContent>
              {orders.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.orderNumber}
                  {o.name ? ` · ${o.name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {orders.length === 0 ? (
        <EmptyState message="This project has no orders yet — create one to plan its workflow." />
      ) : (
        <>
          {/* KPI strip */}
          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard
              label="Progress"
              value={`${progress}%`}
              icon={Activity}
              tone="primary"
              valueTone="primary"
              progress={progress}
              hint={`${completed}/${totalStages} stages complete`}
            />
            <KpiCard
              label="Active Stages"
              value={active}
              icon={Layers}
              tone="info"
              hint="In progress now"
            />
            <KpiCard
              label="Pending"
              value={pending}
              icon={CircleDashed}
              tone="warning"
              valueTone={pending > 0 ? "warning" : "neutral"}
              hint="Awaiting start"
            />
            <KpiCard
              label="Processes"
              value={processes.length}
              icon={ListChecks}
              tone="neutral"
              hint={`${totalStages} total stages`}
            />
          </section>

          {/* Gantt + detail pane */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <div className="overflow-hidden rounded-lg border bg-card">
                {!hasDates && totalStages > 0 && (
                  <div className="border-b bg-warning/10 px-4 py-2 text-[11px] font-medium text-warning">
                    No stage dates set — showing an estimated duration-weighted
                    sequence, not scheduled dates.
                  </div>
                )}
                {totalStages === 0 ? (
                  <EmptyState message="No processes on this order yet. Start one from the order detail to build its workflow." />
                ) : (
                  <div className="min-w-0 overflow-x-auto">
                    <div className="min-w-[720px]">
                      {/* Week header */}
                      <div className="flex h-9 items-center border-b bg-muted/30">
                        <div className="w-48 shrink-0 border-r px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Stage
                        </div>
                        <div className="relative h-full flex-1">
                          {hasDates ? (
                            weeks.map((w, i) => (
                              <span
                                key={i}
                                className="absolute top-1/2 -translate-y-1/2 pl-2 font-mono text-[10px] text-muted-foreground"
                                style={{ left: `${w.leftPct}%` }}
                              >
                                {w.label}
                              </span>
                            ))
                          ) : (
                            <span className="pl-3 font-mono text-[10px] text-muted-foreground">
                              ESTIMATED SEQUENCE →
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stage rows */}
                      <div className="divide-y divide-border">
                        {processes.map((process) => (
                          <div key={process.id}>
                            <div className="flex items-center gap-2 bg-muted/20 px-4 py-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                {process.category?.name ?? "Process"}
                              </span>
                              <StatusBadge label={process.overallStatus} />
                            </div>
                            {[...process.stages]
                              .sort((a, b) => a.sequence - b.sequence)
                              .map((stage) => {
                                bandIndex += 1;
                                const f = flat[bandIndex];
                                const b = band(f, bandIndex);
                                const tone = STAGE_TONE[stage.status] ?? "neutral";
                                return (
                                  <div
                                    key={stage.id}
                                    className="flex min-h-[52px] items-center hover:bg-accent/30"
                                  >
                                    <div className="w-48 shrink-0 border-r px-4 py-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-xs text-primary">
                                          S-{String(stage.sequence).padStart(3, "0")}
                                        </span>
                                      </div>
                                      <p className="mt-0.5 truncate text-sm font-medium">
                                        {stage.name}
                                      </p>
                                    </div>
                                    <div className="relative h-full flex-1 py-2 pr-4">
                                      {/* week gridlines */}
                                      {hasDates &&
                                        weeks.map((w, i) => (
                                          <span
                                            key={i}
                                            className="absolute inset-y-0 w-px bg-border/50"
                                            style={{ left: `${w.leftPct}%` }}
                                          />
                                        ))}
                                      {b ? (
                                        <div
                                          className={cn(
                                            "absolute top-1/2 flex h-8 -translate-y-1/2 items-center gap-2 rounded-r border-l-4 px-2",
                                            BAND_CLASS[stage.status] ??
                                              BAND_CLASS.pending,
                                          )}
                                          style={{
                                            left: `${b.left}%`,
                                            width: `${b.width}%`,
                                          }}
                                          title={stage.name}
                                        >
                                          <StatusBadge
                                            tone={tone}
                                            label={stage.status.replace("_", " ")}
                                          />
                                        </div>
                                      ) : (
                                        <span className="absolute top-1/2 left-2 -translate-y-1/2 font-mono text-[10px] italic text-muted-foreground">
                                          unscheduled
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detail pane */}
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border bg-card p-4">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Resource Allocation
                </h3>
                {resources.length ? (
                  <div className="space-y-3">
                    {resources.map((r) => (
                      <div key={r.name}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium">{r.name}</span>
                          <span className="font-mono text-[11px] text-primary">
                            {r.count} stage{r.count === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(r.count / maxLoad) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No responsible users assigned to this order's stages.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
      <GanttChartSquare className="size-8 text-primary/40" />
      {message}
    </div>
  );
}
