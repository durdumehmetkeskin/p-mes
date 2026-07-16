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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TOOL_STATUSES, toolStatusLabel } from "./tool-form-fields";

interface StatusHistoryRow {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedByEmail: string | null;
  createdAt: string;
}

/**
 * Status management for a tool: change the current status (records an immutable
 * history entry server-side) and show the full transition timeline.
 */
export function ToolStatusCard({
  tool,
}: {
  tool: { id: string; status: string };
}) {
  const apiUrl = useApiUrl();
  const invalidate = useInvalidate();
  const { mutate: changeStatus } = useCustomMutation();

  const [next, setNext] = useState(tool.status);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { result: history } = useList<StatusHistoryRow>({
    resource: "tool-status-history",
    filters: [{ field: "toolId", operator: "eq", value: tool.id }],
    sorters: [{ field: "createdAt", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(tool.id) },
  });
  const rows = history?.data ?? [];

  const changed = next !== tool.status;

  const submit = () => {
    if (!changed) return;
    setSubmitting(true);
    changeStatus(
      {
        url: `${apiUrl}/tools/${tool.id}/status`,
        method: "patch",
        values: { status: next, note: note || undefined },
      },
      {
        onSuccess: () => {
          invalidate({ resource: "tools", invalidates: ["detail"], id: tool.id });
          invalidate({
            resource: "tool-status-history",
            invalidates: ["list"],
          });
          setNote("");
          setSubmitting(false);
        },
        onError: () => setSubmitting(false),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Status</span>
          <StatusBadge label={toolStatusLabel(tool.status)} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Change status */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nextStatus">New status</Label>
            <Select value={next} onValueChange={setNext}>
              <SelectTrigger id="nextStatus" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOOL_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="statusNote">Note (optional)</Label>
            <Input
              id="statusNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for the change"
            />
          </div>
          <Button disabled={!changed || submitting} onClick={submit}>
            {submitting ? "Updating..." : "Update status"}
          </Button>
        </div>

        {/* History timeline */}
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            History ({rows.length})
          </p>
          {rows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium">Change</th>
                  <th className="pb-2 font-medium">By</th>
                  <th className="pb-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2">
                      {h.fromStatus ? toolStatusLabel(h.fromStatus) : "—"}
                      {" → "}
                      <span className="font-medium">
                        {toolStatusLabel(h.toStatus)}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {h.changedByEmail ?? "—"}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {h.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No status changes yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
