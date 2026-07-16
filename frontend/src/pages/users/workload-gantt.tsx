import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { axiosInstance } from "@/providers/axios";

interface WorkItem {
  id: string;
  kind: "stage" | "process";
  title: string;
  orderNumber: string;
  projectName: string;
  start: string | null;
  end: string | null;
  status: string;
}
interface WorkloadUser {
  userId: string;
  userName: string;
  items: WorkItem[];
}

const DAY = 86_400_000;
const LANE_H = 26;

const statusColor: Record<string, string> = {
  completed: "bg-green-500",
  in_progress: "bg-blue-500",
  pending: "bg-slate-400",
  draft: "bg-slate-400",
};

function ms(v: string | null): number | null {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

interface Placed extends WorkItem {
  startMs: number;
  endMs: number;
  lane: number;
}

/** First-fit lane packing — more lanes = heavier concurrent workload. */
function packLanes(items: WorkItem[]): { placed: Placed[]; lanes: number } {
  const rows = items
    .map((it) => {
      const s = ms(it.start);
      if (s == null) return null;
      const e = Math.max(ms(it.end) ?? s, s + DAY);
      return { ...it, startMs: s, endMs: e };
    })
    .filter((r): r is Placed => r !== null)
    .sort((a, b) => a.startMs - b.startMs);

  const laneEnds: number[] = [];
  for (const r of rows) {
    let lane = laneEnds.findIndex((end) => end <= r.startMs);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(r.endMs);
    } else {
      laneEnds[lane] = r.endMs;
    }
    r.lane = lane;
  }
  return { placed: rows, lanes: Math.max(laneEnds.length, 1) };
}

function fmt(v: string | null): string {
  return v ? new Date(v).toLocaleDateString() : "—";
}

export function WorkloadGantt() {
  const [users, setUsers] = useState<WorkloadUser[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    axiosInstance
      .get<WorkloadUser[]>("/workload", {
        params: { from: from || undefined, to: to || undefined },
      })
      .then(({ data }) => setUsers(data))
      .catch(() => setError("Could not load workload (needs Workload: Read)."))
      .finally(() => setLoading(false));
  }, [from, to]);

  const packed = useMemo(
    () => users.map((u) => ({ ...u, ...packLanes(u.items) })),
    [users],
  );

  // Overall timeline bounds.
  const [minMs, maxMs] = useMemo(() => {
    const all = packed.flatMap((u) => u.placed);
    if (!all.length) return [0, 0];
    const lo = Math.min(...all.map((p) => p.startMs));
    const hi = Math.max(...all.map((p) => p.endMs));
    const pad = Math.max((hi - lo) * 0.02, DAY);
    return [lo - pad, hi + pad];
  }, [packed]);

  const span = maxMs - minMs;
  const pct = (t: number) => (span > 0 ? ((t - minMs) / span) * 100 : 0);

  // Month tick marks along the axis.
  const ticks = useMemo(() => {
    if (span <= 0) return [] as { left: number; label: string }[];
    const out: { left: number; label: string }[] = [];
    const d = new Date(minMs);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    while (d.getTime() <= maxMs && out.length < 60) {
      const t = d.getTime();
      if (t >= minMs) {
        out.push({
          left: pct(t),
          label: d.toLocaleDateString(undefined, {
            month: "short",
            year: "2-digit",
          }),
        });
      }
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return out;
  }, [minMs, maxMs, span]);

  const todayLeft = pct(Date.now());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
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
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-slate-400" /> Pending
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-blue-500" /> In progress
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-green-500" /> Completed
          </span>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : packed.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No assigned work in this range. Assign users as responsible on
          processes and stages.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <div className="min-w-[760px]">
            {/* Axis */}
            <div className="flex border-b bg-muted/30 text-xs text-muted-foreground">
              <div className="w-48 shrink-0 border-r px-3 py-2 font-medium">
                User
              </div>
              <div className="relative h-8 flex-1">
                {ticks.map((tk, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full border-l border-dashed border-muted-foreground/30 pl-1"
                    style={{ left: `${tk.left}%` }}
                  >
                    {tk.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {packed.map((u) => (
              <div key={u.userId} className="flex border-b last:border-0">
                <div className="w-48 shrink-0 border-r px-3 py-2">
                  <div className="truncate text-sm font-medium">
                    {u.userName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {u.items.length} task{u.items.length === 1 ? "" : "s"} ·
                    peak {u.lanes}
                  </div>
                </div>
                <div
                  className="relative flex-1"
                  style={{ height: u.lanes * LANE_H + 8 }}
                >
                  {todayLeft >= 0 && todayLeft <= 100 && (
                    <div
                      className="absolute top-0 z-10 h-full border-l-2 border-red-400/70"
                      style={{ left: `${todayLeft}%` }}
                      title="Today"
                    />
                  )}
                  {u.placed.map((p) => (
                    <div
                      key={`${p.kind}-${p.id}`}
                      className={`absolute rounded px-1 text-[11px] leading-[18px] text-white ${
                        statusColor[p.status] ?? "bg-slate-400"
                      } ${p.kind === "process" ? "ring-1 ring-black/20" : ""}`}
                      style={{
                        left: `${pct(p.startMs)}%`,
                        width: `max(${pct(p.endMs) - pct(p.startMs)}%, 8px)`,
                        top: p.lane * LANE_H + 4,
                        height: 18,
                      }}
                      title={`${p.kind === "process" ? "[Process] " : ""}${p.title} · ${p.projectName} / ${p.orderNumber}\n${fmt(p.start)} → ${fmt(p.end)} · ${p.status}`}
                    >
                      <span className="block truncate">
                        {p.title} · {p.orderNumber}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Bars are the stages each user is responsible for, stacked into lanes —
        more lanes mean more overlapping work (higher load). Completed uses
        actual start→completed; in-progress starts at the actual start; pending
        uses the estimated window.
        <Badge variant="outline" className="ml-2">
          {packed.reduce((n, u) => n + u.items.length, 0)} stages
        </Badge>
      </p>
    </div>
  );
}
