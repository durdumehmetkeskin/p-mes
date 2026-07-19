import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";

import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { useCanEditProject } from "@/hooks/use-can-edit-project";

interface ProjectRecord {
  id: string;
  code: string;
  name: string;
  status: string | null;
  managerUserId: string | null;
  managerUser: { name: string } | null;
  customerCompany: { code: string; name: string } | null;
  orderCount?: number;
}

export const ProjectsList = () => {
  const canEditProject = useCanEditProject();
  const columns = useMemo<ColumnDef<ProjectRecord>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <Link
            to={`/projects/${row.original.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            to={`/projects/${row.original.id}`}
            className="hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "manager",
        header: "Manager",
        enableSorting: false,
        cell: ({ row }) => row.original.managerUser?.name ?? "—",
      },
      {
        id: "company",
        header: "Customer",
        enableSorting: false,
        cell: ({ row }) => row.original.customerCompany?.name ?? "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ getValue }) => {
          const status = getValue() as string | null;
          return status ? <StatusBadge label={status} /> : "—";
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <ShowButton size="icon" variant="outline" recordItemId={row.original.id}>
              <Eye className="h-4 w-4" />
            </ShowButton>
            {/* Editing a project is reserved to admins and its manager. A
                plain link (not EditButton) so the projects:update permission
                gate cannot hide it from a non-admin manager. */}
            {canEditProject(row.original.managerUserId) && (
              <Button asChild size="icon" variant="outline">
                <Link to={`/projects/${row.original.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {/* Leaf-first: a project can only be deleted once it has no orders. */}
            {(row.original.orderCount ?? 0) === 0 && (
              <DeleteButton size="icon" recordItemId={row.original.id}>
                <Trash2 className="h-4 w-4" />
              </DeleteButton>
            )}
          </div>
        ),
      },
    ],
    [canEditProject],
  );

  const table = useTable<ProjectRecord>({
    columns,
    refineCoreProps: { resource: "projects" },
  });

  return (
    <ListView>
      <ListViewHeader />
      <DataTable table={table} />
    </ListView>
  );
};
