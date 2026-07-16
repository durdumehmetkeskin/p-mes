import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, QrCode, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { EditButton } from "@/components/refine-ui/buttons/edit";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { QrCodeDialog } from "@/components/qr/qr-code-dialog";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockOnHandPanel } from "./stock-on-hand-panel";

interface MaterialRecord {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  isLotTracked: boolean;
  isSerialTracked: boolean;
  materialType: { id: string; name: string } | null;
  materialUnit: { id: string; name: string } | null;
}

export const MaterialsList = () => {
  const columns = useMemo<ColumnDef<MaterialRecord>[]>(
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
        id: "materialType",
        header: "Type",
        enableSorting: false,
        cell: ({ row }) => row.original.materialType?.name ?? "—",
      },
      {
        id: "materialUnit",
        header: "Unit",
        enableSorting: false,
        cell: ({ row }) => row.original.materialUnit?.name ?? "—",
      },
      {
        id: "tracking",
        header: "Tracking",
        enableSorting: false,
        cell: ({ row }) => {
          const { isLotTracked, isSerialTracked } = row.original;
          if (!isLotTracked && !isSerialTracked) return "—";
          return (
            <div className="flex flex-wrap gap-1">
              {isLotTracked && <Badge variant="outline">lot</Badge>}
              {isSerialTracked && <Badge variant="outline">serial</Badge>}
            </div>
          );
        },
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
            <QrCodeDialog
              resource="materials"
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

  const table = useTable<MaterialRecord>({
    columns,
    refineCoreProps: { resource: "materials" },
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "stock" ? "stock" : "materials";

  return (
    <ListView>
      <ListViewHeader />

      <Tabs
        value={tab}
        onValueChange={(v) =>
          setSearchParams(
            (prev) => {
              if (v === "stock") prev.set("tab", "stock");
              else prev.delete("tab");
              return prev;
            },
            { replace: true },
          )
        }
      >
        <TabsList>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="stock">Stock on Hand</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <DataTable table={table} />
        </TabsContent>

        <TabsContent value="stock">
          <StockOnHandPanel />
        </TabsContent>
      </Tabs>
    </ListView>
  );
};
