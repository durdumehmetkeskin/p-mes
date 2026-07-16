import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { EditButton } from "@/components/refine-ui/buttons/edit";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";

interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
}

export const WarehousesList = () => {
  const columns = useMemo<ColumnDef<WarehouseRecord>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "address",
        header: "Address",
        enableSorting: false,
        cell: ({ getValue }) => (getValue() as string) ?? "—",
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

  const table = useTable<WarehouseRecord>({
    columns,
    refineCoreProps: { resource: "warehouses" },
  });

  return (
    <ListView>
      <ListViewHeader />
      <DataTable table={table} />
    </ListView>
  );
};
