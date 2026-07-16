import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { EditButton } from "@/components/refine-ui/buttons/edit";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";

interface ReportDefinitionRecord {
  id: string;
  key: string;
  name: string;
  dataSource: string;
  recipe: string;
  isActive: boolean;
  isSystem: boolean;
}

const RECIPE_LABEL: Record<string, string> = {
  "chrome-pdf": "PDF",
  "html-to-xlsx": "Excel",
  "html-embedded-in-docx": "Word",
};

export const ReportDefinitionsList = () => {
  const columns = useMemo<ColumnDef<ReportDefinitionRecord>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "dataSource",
        header: "Data source",
        enableSorting: false,
      },
      {
        accessorKey: "recipe",
        header: "Default format",
        enableSorting: false,
        cell: ({ getValue }) =>
          RECIPE_LABEL[getValue() as string] ?? (getValue() as string),
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
        accessorKey: "isSystem",
        header: "Type",
        cell: ({ row }) =>
          row.original.isSystem ? (
            <Badge variant="secondary">system</Badge>
          ) : (
            <Badge variant="outline">custom</Badge>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <EditButton
              size="icon"
              variant="outline"
              recordItemId={row.original.id}
            >
              <Pencil className="h-4 w-4" />
            </EditButton>
            {/* System reports cannot be deleted (enforced by the API too). */}
            {!row.original.isSystem && (
              <DeleteButton size="icon" recordItemId={row.original.id}>
                <Trash2 className="h-4 w-4" />
              </DeleteButton>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  const table = useTable<ReportDefinitionRecord>({
    columns,
    refineCoreProps: { resource: "report-definitions" },
  });

  return (
    <ListView>
      <ListViewHeader title="Report Templates" />
      <DataTable table={table} />
    </ListView>
  );
};
