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

interface LotRecord {
  id: string;
  lotNumber: string;
  expiryDate: string | null;
  status: string;
  material: { id: string; code: string; name: string } | null;
  rack: { id: string; code: string } | null;
  customer: { id: string; name: string } | null;
  project: { id: string; name: string; code?: string } | null;
}

export const LotsList = () => {
  const columns = useMemo<ColumnDef<LotRecord>[]>(
    () => [
      {
        accessorKey: "lotNumber",
        header: "Lot #",
        cell: ({ getValue }) => (
          <span className="font-mono text-primary">{getValue() as string}</span>
        ),
      },
      {
        id: "material",
        header: "Material",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.material
            ? `${row.original.material.code} · ${row.original.material.name}`
            : "—",
      },
      {
        id: "rack",
        header: "Rack",
        enableSorting: false,
        cell: ({ row }) => row.original.rack?.code ?? "—",
      },
      {
        id: "customer",
        header: "Customer",
        enableSorting: false,
        cell: ({ row }) => row.original.customer?.name ?? "—",
      },
      {
        id: "project",
        header: "Project",
        enableSorting: false,
        cell: ({ row }) => row.original.project?.name ?? "—",
      },
      {
        accessorKey: "expiryDate",
        header: "Expiry",
        cell: ({ getValue }) => (
          <span className="font-mono text-muted-foreground">
            {(getValue() as string) ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Expiry status",
        cell: ({ getValue }) => <StatusBadge label={getValue() as string} />,
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

  const table = useTable<LotRecord>({
    columns,
    refineCoreProps: { resource: "lots" },
  });

  return (
    <ListView>
      <ListViewHeader />
      <DataTable table={table} />
    </ListView>
  );
};
