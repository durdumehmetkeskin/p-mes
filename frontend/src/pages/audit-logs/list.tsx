import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { axiosInstance } from "@/providers/axios";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

const ACTIONS = ["CREATE", "UPDATE", "DELETE"] as const;

interface AuditLogRecord {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId: string | null;
  actorEmail: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedColumns: string[] | null;
  createdAt: string;
}

// Always-changing / structural fields excluded from the field-level diff.
const DIFF_IGNORE = new Set(["updatedAt", "createdAt", "id"]);

interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

/** Field-level diff between the before/after snapshots of an UPDATE. */
function computeChanges(log: AuditLogRecord): FieldChange[] {
  const before = log.before ?? {};
  const after = log.after ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: FieldChange[] = [];
  for (const key of keys) {
    if (DIFF_IGNORE.has(key)) continue;
    const b = JSON.stringify((before as Record<string, unknown>)[key]);
    const a = JSON.stringify((after as Record<string, unknown>)[key]);
    if (b !== a) {
      changes.push({
        field: key,
        before: (before as Record<string, unknown>)[key],
        after: (after as Record<string, unknown>)[key],
      });
    }
  }
  return changes;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    // Render role-like arrays of objects by their name when present.
    return value
      .map((v) =>
        v && typeof v === "object"
          ? ((v as Record<string, unknown>).name ??
            JSON.stringify(v))
          : String(v),
      )
      .join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
      {value ? JSON.stringify(value, null, 2) : "—"}
    </pre>
  );
}

function ChangesTable({ changes }: { changes: FieldChange[] }) {
  if (changes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No field-level changes.</p>
    );
  }
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="p-2 font-medium">Field</th>
            <th className="p-2 font-medium">Before</th>
            <th className="p-2 font-medium">After</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.field} className="border-b last:border-0 align-top">
              <td className="p-2 font-medium">{c.field}</td>
              <td className="p-2 text-muted-foreground break-words">
                {formatValue(c.before)}
              </td>
              <td className="p-2 break-words">{formatValue(c.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailsDialog({ log }: { log: AuditLogRecord }) {
  const [open, setOpen] = useState(false);
  const isUpdate = log.action === "UPDATE";
  const changes = isUpdate ? computeChanges(log) : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {log.action} {log.entity}
            {log.entityId ? ` · ${log.entityId}` : ""}
          </DialogTitle>
        </DialogHeader>

        {isUpdate && (
          <div>
            <div className="mb-1 text-sm font-medium">Changes</div>
            <ChangesTable changes={changes} />
          </div>
        )}

        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Raw before / after snapshots
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1 text-sm font-medium">Before</div>
              <JsonBlock value={log.before} />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">After</div>
              <JsonBlock value={log.after} />
            </div>
          </div>
        </details>
      </DialogContent>
    </Dialog>
  );
}

export const AuditLogsList = () => {
  const columns = useMemo<ColumnDef<AuditLogRecord>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "When",
        cell: ({ getValue }) =>
          new Date(getValue() as string).toLocaleString(),
      },
      {
        accessorKey: "actorEmail",
        header: "Who",
        enableSorting: false,
        cell: ({ getValue }) =>
          (getValue() as string) ?? (
            <span className="text-muted-foreground">anonymous</span>
          ),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => <StatusBadge label={row.original.action} />,
      },
      { accessorKey: "entity", header: "Entity" },
      {
        accessorKey: "changedColumns",
        header: "Changed",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.changedColumns?.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.changedColumns.map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
            </div>
          ) : (
            "—"
          ),
      },
      {
        id: "details",
        header: "",
        enableSorting: false,
        cell: ({ row }) => <DetailsDialog log={row.original} />,
      },
    ],
    [],
  );

  const table = useTable<AuditLogRecord>({
    columns,
    refineCoreProps: {
      resource: "audit-logs",
      sorters: { initial: [{ field: "createdAt", order: "desc" }] },
    },
  });

  const { setFilters } = table.refineCore;
  const [entity, setEntity] = useState<string>(ALL);
  const [action, setAction] = useState<string>(ALL);

  // Entity filter options come from the trail itself, so the list always
  // reflects exactly which entities have been audited (never goes stale).
  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  useEffect(() => {
    axiosInstance
      .get<string[]>("/audit-logs/entities")
      .then((res) => setEntityOptions(res.data ?? []))
      .catch(() => setEntityOptions([]));
  }, []);

  const apply = (nextEntity: string, nextAction: string) => {
    setFilters(
      [
        ...(nextEntity !== ALL
          ? [{ field: "entity", operator: "eq" as const, value: nextEntity }]
          : []),
        ...(nextAction !== ALL
          ? [{ field: "action", operator: "eq" as const, value: nextAction }]
          : []),
      ],
      "replace",
    );
  };

  return (
    <ListView>
      <ListViewHeader />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2 sm:w-56">
          <Label htmlFor="entityFilter">Entity</Label>
          <Select
            value={entity}
            onValueChange={(v) => {
              setEntity(v);
              apply(v, action);
            }}
          >
            <SelectTrigger id="entityFilter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All entities</SelectItem>
              {entityOptions.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:w-44">
          <Label htmlFor="actionFilter">Action</Label>
          <Select
            value={action}
            onValueChange={(v) => {
              setAction(v);
              apply(entity, v);
            }}
          >
            <SelectTrigger id="actionFilter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable table={table} />
    </ListView>
  );
};
