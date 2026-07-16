import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import { Eye, Pencil, Trash2 } from "lucide-react";

import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { EditButton } from "@/components/refine-ui/buttons/edit";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { WorkloadGantt } from "./workload-gantt";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  roles: string[];
  createdAt: string;
}

export const UsersList = () => {
  const columns = useMemo<ColumnDef<UserRecord>[]>(
    () => [
      { accessorKey: "email", header: "Email" },
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "roles",
        header: "Roles",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles?.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ getValue }) =>
          new Date(getValue() as string).toLocaleDateString(),
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

  const table = useTable<UserRecord>({
    columns,
    refineCoreProps: { resource: "users" },
  });

  return (
    <ListView>
      <ListViewHeader />
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Users</TabsTrigger>
          <TabsTrigger value="workload">Workload (Gantt)</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <DataTable table={table} />
        </TabsContent>
        <TabsContent value="workload">
          <WorkloadGantt />
        </TabsContent>
      </Tabs>
    </ListView>
  );
};
