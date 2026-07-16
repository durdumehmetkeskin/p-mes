import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { EditButton } from "@/components/refine-ui/buttons/edit";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Eye } from "lucide-react";

interface ZoneRecord {
  id: string;
  code: string;
  name: string | null;
  isActive: boolean;
  warehouse: { id: string; code: string; name: string } | null;
}

export const ZonesList = () => {
  const columns = useMemo<ColumnDef<ZoneRecord>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      {
        accessorKey: "name",
        header: "Name",
        enableSorting: false,
        cell: ({ getValue }) => (getValue() as string) ?? "—",
      },
      {
        id: "warehouse",
        header: "Warehouse",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.warehouse
            ? `${row.original.warehouse.code} · ${row.original.warehouse.name}`
            : "—",
      },
      {
        accessorKey: "isActive",
        header: "Status",
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
            <DeleteButton size="icon" recordItemId={row.original.id}>
              <Trash2 className="h-4 w-4" />
            </DeleteButton>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useTable<ZoneRecord>({
    columns,
    refineCoreProps: { resource: "zones" },
  });

  return (
    <ListView>
      <ListViewHeader />
      <DataTable table={table} />
    </ListView>
  );
};
