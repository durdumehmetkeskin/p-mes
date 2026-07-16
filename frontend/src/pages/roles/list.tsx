import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { EditButton } from "@/components/refine-ui/buttons/edit";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";

interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
}

export const RolesList = () => {
  const columns = useMemo<ColumnDef<RoleRecord>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "description",
        header: "Description",
        enableSorting: false,
        cell: ({ getValue }) => (getValue() as string) ?? "—",
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
            {/* System roles cannot be deleted (enforced by the API too). */}
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

  const table = useTable<RoleRecord>({
    columns,
    refineCoreProps: { resource: "roles" },
  });

  return (
    <ListView>
      <ListViewHeader />
      <DataTable table={table} />
    </ListView>
  );
};
