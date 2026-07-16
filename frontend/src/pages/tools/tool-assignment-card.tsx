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

interface AssignmentRow {
  id: string;
  assignedTo: string;
  status: string;
  note: string | null;
  assignedByEmail: string | null;
  returnedByEmail: string | null;
  returnNote: string | null;
  returnedAt: string | null;
  createdAt: string;
}

/**
 * Assignment (check-out / check-in) management for a tool: assign it to an
 * operator / work order / machine, return it, and show the assignment history.
 */
export function ToolAssignmentCard({ tool }: { tool: { id: string } }) {
  const apiUrl = useApiUrl();
  const invalidate = useInvalidate();
  const { mutate } = useCustomMutation();

  const [assignedTo, setAssignedTo] = useState("");
  const [note, setNote] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { result: assignments } = useList<AssignmentRow>({
    resource: "tool-assignments",
    filters: [{ field: "toolId", operator: "eq", value: tool.id }],
    sorters: [{ field: "createdAt", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(tool.id) },
  });
  const rows = assignments?.data ?? [];
  const active = rows.find((a) => a.status === "active") ?? null;

  const refresh = () => {
    invalidate({ resource: "tools", invalidates: ["detail"], id: tool.id });
    invalidate({ resource: "tool-assignments", invalidates: ["list"] });
  };

  const run = (action: "assign" | "return", values: Record<string, unknown>) => {
    setSubmitting(true);
    mutate(
      { url: `${apiUrl}/tools/${tool.id}/${action}`, method: "post", values },
      {
        onSuccess: () => {
          setAssignedTo("");
          setNote("");
          setReturnNote("");
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
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Assignment</span>
          {active ? (
            <StatusBadge tone="info" label={`Assigned · ${active.assignedTo}`} />
          ) : (
            <StatusBadge label="Available" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {active ? (
          /* Return form */
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="returnNote">Return note (optional)</Label>
              <Input
                id="returnNote"
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                placeholder="Condition, remarks…"
              />
            </div>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() =>
                run("return", { note: returnNote || undefined })
              }
            >
              {submitting ? "Returning..." : "Return"}
            </Button>
          </div>
        ) : (
          /* Assign form */
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="assignedTo">Assign to</Label>
              <Input
                id="assignedTo"
                className="w-56"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Operator / work order / machine"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="assignNote">Note (optional)</Label>
              <Input
                id="assignNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Purpose"
              />
            </div>
            <Button
              disabled={submitting || assignedTo.trim().length < 1}
              onClick={() =>
                run("assign", {
                  assignedTo: assignedTo.trim(),
                  note: note || undefined,
                })
              }
            >
              {submitting ? "Assigning..." : "Assign"}
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
                  <th className="pb-2 font-medium">Assigned to</th>
                  <th className="pb-2 font-medium">Out</th>
                  <th className="pb-2 font-medium">Returned</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2">{a.assignedTo}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()}
                      {a.assignedByEmail ? ` · ${a.assignedByEmail}` : ""}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {a.returnedAt
                        ? `${new Date(a.returnedAt).toLocaleString()}${
                            a.returnedByEmail ? ` · ${a.returnedByEmail}` : ""
                          }`
                        : "—"}
                    </td>
                    <td className="py-2">
                      {a.status === "active" ? (
                        <StatusBadge label="active" />
                      ) : (
                        <StatusBadge label="returned" />
                      )}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {[a.note, a.returnNote].filter(Boolean).join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No assignments yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
