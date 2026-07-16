import { useList } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  Boxes,
  Eye,
  LayoutGrid,
  Pencil,
  QrCode,
  Table as TableIcon,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { EditButton } from "@/components/refine-ui/buttons/edit";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { DataTablePagination } from "@/components/refine-ui/data-table/data-table-pagination";
import { KpiCard } from "@/components/refine-ui/kpi-card";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { QrCodeDialog } from "@/components/qr/qr-code-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ToolCard, type ToolRecord, toolHealthTone } from "./tool-card";
import {
  TOOL_CATEGORIES,
  toolCategoryLabel,
  toolStatusLabel,
} from "./tool-form-fields";

const ALL = "__all__";

function useStatusCount(status?: string): number {
  const { result } = useList({
    resource: "tools",
    pagination: { pageSize: 1 },
    filters: status
      ? [{ field: "status", operator: "eq", value: status }]
      : [],
  });
  return result?.total ?? 0;
}

export const ToolsList = () => {
  const [view, setView] = useState<"table" | "cards">("table");

  const total = useStatusCount();
  const inUse = useStatusCount("in_use");
  const maintenance = useStatusCount("maintenance");
  const retired = useStatusCount("retired");

  const columns = useMemo<ColumnDef<ToolRecord>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ getValue }) => (
          <span className="font-mono text-primary">{getValue() as string}</span>
        ),
      },
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "category",
        header: "Category",
        enableSorting: false,
        cell: ({ row }) => toolCategoryLabel(row.original.category),
      },
      {
        id: "toolType",
        header: "Type",
        enableSorting: false,
        cell: ({ row }) => row.original.toolType?.name ?? "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge
            tone={toolHealthTone(row.original.status)}
            label={toolStatusLabel(row.original.status)}
          />
        ),
      },
      {
        id: "rack",
        header: "Rack",
        enableSorting: false,
        cell: ({ row }) => {
          const loc = row.original.rack;
          return loc ? (
            <span className="font-mono text-muted-foreground">
              {[loc.warehouse?.code, loc.code].filter(Boolean).join(" / ")}
            </span>
          ) : (
            "—"
          );
        },
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => (
          <StatusBadge
            tone={row.original.isActive ? "success" : "neutral"}
            label={row.original.isActive ? "Active" : "Inactive"}
          />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <ShowButton
              size="icon"
              variant="outline"
              recordItemId={row.original.id}
            >
              <Eye className="h-4 w-4" />
            </ShowButton>
            <EditButton
              size="icon"
              variant="outline"
              recordItemId={row.original.id}
            >
              <Pencil className="h-4 w-4" />
            </EditButton>
            <QrCodeDialog
              resource="tools"
              id={row.original.id}
              code={row.original.code}
              title={row.original.name}
              trigger={
                <Button size="icon" variant="outline" title="QR kodu">
                  <QrCode className="h-4 w-4" />
                </Button>
              }
            />
            <DeleteButton size="icon" recordItemId={row.original.id}>
              <Trash2 className="h-4 w-4" />
            </DeleteButton>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useTable<ToolRecord>({
    columns,
    refineCoreProps: { resource: "tools" },
  });

  const { setFilters } = table.refineCore;
  const rows = (table.refineCore.tableQuery.data?.data ?? []) as ToolRecord[];
  const { currentPage, setCurrentPage, pageCount, pageSize, setPageSize } =
    table.refineCore;

  return (
    <ListView>
      <ListViewHeader />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Total Equipment" value={total} icon={Boxes} tone="primary" />
        <KpiCard
          label="In Use"
          value={inUse}
          icon={Zap}
          tone="info"
          valueTone="info"
        />
        <KpiCard
          label="In Maintenance"
          value={maintenance}
          icon={Wrench}
          tone="warning"
          valueTone={maintenance > 0 ? "warning" : "neutral"}
        />
        <KpiCard
          label="Retired"
          value={retired}
          icon={AlertTriangle}
          tone="danger"
          valueTone={retired > 0 ? "danger" : "neutral"}
        />
      </div>

      {/* Toolbar: category filter + view toggle */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <Label htmlFor="categoryFilter">Category</Label>
          <Select
            defaultValue={ALL}
            onValueChange={(v) =>
              setFilters(
                v === ALL
                  ? []
                  : [{ field: "category", operator: "eq", value: v }],
                "replace",
              )
            }
          >
            <SelectTrigger id="categoryFilter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {TOOL_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            size="sm"
            variant={view === "table" ? "secondary" : "ghost"}
            onClick={() => setView("table")}
            className="h-8"
          >
            <TableIcon className="mr-1 h-4 w-4" />
            Table
          </Button>
          <Button
            size="sm"
            variant={view === "cards" ? "secondary" : "ghost"}
            onClick={() => setView("cards")}
            className="h-8"
          >
            <LayoutGrid className="mr-1 h-4 w-4" />
            Registry
          </Button>
        </div>
      </div>

      {view === "table" ? (
        <DataTable table={table} />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.length ? (
            <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3")}>
              {rows.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border py-16 text-center text-sm text-muted-foreground">
              No tools to display.
            </div>
          )}
          {rows.length > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              pageCount={pageCount}
              setCurrentPage={setCurrentPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              total={table.refineCore.tableQuery.data?.total}
            />
          )}
        </div>
      )}
    </ListView>
  );
};
