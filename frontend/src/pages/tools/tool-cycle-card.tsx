import {
  useApiUrl,
  useCustomMutation,
  useInvalidate,
  useList,
} from "@refinedev/core";
import { useState } from "react";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CycleLogRow {
  id: string;
  cycles: number;
  resultingLifeCycle: number;
  source: string;
  note: string | null;
  recordedByEmail: string | null;
  createdAt: string;
}

const SOURCE_LABEL: Record<string, string> = {
  usage: "Production",
  manual: "Manual",
  reset: "Reset",
};

export function ToolCycleCard({
  tool,
}: {
  tool: { id: string; currentLifeCycle: number; maxLifeCycle: number | null };
}) {
  const apiUrl = useApiUrl();
  const invalidate = useInvalidate();
  const { mutate } = useCustomMutation();

  const [cycles, setCycles] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { result: logs } = useList<CycleLogRow>({
    resource: "tool-cycle-logs",
    filters: [{ field: "toolId", operator: "eq", value: tool.id }],
    sorters: [{ field: "createdAt", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(tool.id) },
  });
  const rows = logs?.data ?? [];

  const current = tool.currentLifeCycle;
  const max = tool.maxLifeCycle;
  const pct =
    max && max > 0 ? Math.min(100, Math.round((current / max) * 100)) : null;
  const overLimit = max != null && current >= max;

  const refresh = () => {
    invalidate({ resource: "tools", invalidates: ["detail"], id: tool.id });
    invalidate({ resource: "tool-cycle-logs", invalidates: ["list"] });
  };

  const run = (path: "cycles" | "cycles/reset", values: Record<string, unknown>) => {
    setSubmitting(true);
    mutate(
      { url: `${apiUrl}/tools/${tool.id}/${path}`, method: "post", values },
      {
        onSuccess: () => {
          setCycles("");
          setNote("");
          setSubmitting(false);
          refresh();
        },
        onError: () => setSubmitting(false),
      },
    );
  };

  const cyclesNum = Number(cycles);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Cycle counter</span>
          <span className="flex items-center gap-2 text-sm font-normal">
            <span className="text-muted-foreground">
              {current}
              {max != null ? ` / ${max}` : ""} cycles
            </span>
            {overLimit && <StatusBadge tone="error" label="life reached" />}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress vs. rated life */}
        {pct != null && (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded bg-muted">
              <div
                className={
                  overLimit ? "h-full bg-destructive" : "h-full bg-primary"
                }
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {overLimit
                ? `${current - (max ?? 0)} over rated life`
                : `${(max ?? 0) - current} cycles remaining (${pct}%)`}
            </p>
          </div>
        )}

        {/* Add / reset */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="addCycles">Add cycles</Label>
            <Input
              id="addCycles"
              type="number"
              min="1"
              step="1"
              className="w-32"
              value={cycles}
              onChange={(e) => setCycles(e.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="cycleNote">Note (optional)</Label>
            <Input
              id="cycleNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            disabled={submitting || !(cyclesNum >= 1)}
            onClick={() =>
              run("cycles", {
                cycles: Math.round(cyclesNum),
                note: note || undefined,
              })
            }
          >
            {submitting ? "Saving..." : "Add"}
          </Button>
          <Button
            variant="outline"
            disabled={submitting || current === 0}
            onClick={() => run("cycles/reset", { note: note || undefined })}
          >
            Reset
          </Button>
        </div>

        {/* Log */}
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Cycle log ({rows.length})
          </p>
          {rows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium text-right">Change</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                  <th className="pb-2 font-medium">By</th>
                  <th className="pb-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2">
                      {SOURCE_LABEL[l.source] ?? l.source}
                    </td>
                    <td className="py-2 text-right">
                      {l.cycles > 0 ? `+${l.cycles}` : l.cycles}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {l.resultingLifeCycle}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {l.recordedByEmail ?? "—"}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {l.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No cycle changes yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
