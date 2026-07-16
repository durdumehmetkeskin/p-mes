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

interface UsageRow {
  id: string;
  usedFor: string | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  quantity: number | null;
  note: string | null;
  recordedByEmail: string | null;
}

function fmtDuration(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Usage tracking for a tool: start/end a usage session and show cumulative
 * utilisation (sessions, total time, total output) plus the full history.
 */
export function ToolUsageCard({ tool }: { tool: { id: string } }) {
  const apiUrl = useApiUrl();
  const invalidate = useInvalidate();
  const { mutate } = useCustomMutation();

  const [usedFor, setUsedFor] = useState("");
  const [startNote, setStartNote] = useState("");
  const [quantity, setQuantity] = useState("");
  const [endNote, setEndNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { result: usages } = useList<UsageRow>({
    resource: "tool-usages",
    filters: [{ field: "toolId", operator: "eq", value: tool.id }],
    sorters: [{ field: "startedAt", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(tool.id) },
  });
  const rows = usages?.data ?? [];
  const ongoing = rows.find((u) => u.status === "ongoing") ?? null;
  const completed = rows.filter((u) => u.status === "completed");
  const totalMinutes = completed.reduce(
    (s, u) => s + (u.durationMinutes ?? 0),
    0,
  );
  const totalQuantity = completed.reduce((s, u) => s + (u.quantity ?? 0), 0);

  const refresh = () => {
    invalidate({ resource: "tools", invalidates: ["detail"], id: tool.id });
    invalidate({ resource: "tool-usages", invalidates: ["list"] });
  };

  const run = (action: "usage/start" | "usage/end", values: Record<string, unknown>) => {
    setSubmitting(true);
    mutate(
      { url: `${apiUrl}/tools/${tool.id}/${action}`, method: "post", values },
      {
        onSuccess: () => {
          setUsedFor("");
          setStartNote("");
          setQuantity("");
          setEndNote("");
          setSubmitting(false);
          refresh();
        },
        onError: () => setSubmitting(false),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <span>Usage</span>
            {ongoing ? (
              <StatusBadge label="In use" />
            ) : (
              <StatusBadge label="Idle" />
            )}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {completed.length} session{completed.length === 1 ? "" : "s"} ·{" "}
            {fmtDuration(totalMinutes)} · {totalQuantity} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ongoing ? (
          /* End form */
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">
                In use since {new Date(ongoing.startedAt).toLocaleString()}
                {ongoing.usedFor ? ` · ${ongoing.usedFor}` : ""}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="usageQty">Quantity / cycles</Label>
              <Input
                id="usageQty"
                type="number"
                step="0.001"
                min="0"
                className="w-32"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="endNote">Note (optional)</Label>
              <Input
                id="endNote"
                value={endNote}
                onChange={(e) => setEndNote(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() =>
                run("usage/end", {
                  quantity: quantity === "" ? undefined : Number(quantity),
                  note: endNote || undefined,
                })
              }
            >
              {submitting ? "Ending..." : "End usage"}
            </Button>
          </div>
        ) : (
          /* Start form */
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="usedFor">Used for</Label>
              <Input
                id="usedFor"
                className="w-56"
                value={usedFor}
                onChange={(e) => setUsedFor(e.target.value)}
                placeholder="Work order / operation / machine"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="startNote">Note (optional)</Label>
              <Input
                id="startNote"
                value={startNote}
                onChange={(e) => setStartNote(e.target.value)}
              />
            </div>
            <Button
              disabled={submitting}
              onClick={() =>
                run("usage/start", {
                  usedFor: usedFor || undefined,
                  note: startNote || undefined,
                })
              }
            >
              {submitting ? "Starting..." : "Start usage"}
            </Button>
          </div>
        )}

        {/* History */}
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            History ({rows.length})
          </p>
          {rows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Used for</th>
                  <th className="pb-2 font-medium">Started</th>
                  <th className="pb-2 font-medium">Ended</th>
                  <th className="pb-2 font-medium text-right">Duration</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2">{u.usedFor ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(u.startedAt).toLocaleString()}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {u.endedAt ? (
                        new Date(u.endedAt).toLocaleString()
                      ) : (
                        <StatusBadge label="ongoing" />
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {fmtDuration(u.durationMinutes)}
                    </td>
                    <td className="py-2 text-right">{u.quantity ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">
                      {u.recordedByEmail ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No usage yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
