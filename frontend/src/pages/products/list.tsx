import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, QrCode, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { QrCodeDialog } from "@/components/qr/qr-code-dialog";
import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { EditButton } from "@/components/refine-ui/buttons/edit";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import {
  ListView,
  ListViewHeader,
} from "@/components/refine-ui/views/list-view";

interface ProductRecord {
  id: string;
  code: string;
  name: string;
  quantity: number;
  producedAt: string | null;
  productType: { id: string; name: string } | null;
  materialUnit: { id: string; name: string } | null;
  order: { id: string; orderNumber: string } | null;
  stage: { id: string; name: string } | null;
  storageRack: {
    code: string;
    storage?: { code: string; location?: { name: string } | null } | null;
  } | null;
  handoverStatus?: "produced" | "delivering" | "received";
}

export const ProductsList = () => {
  const columns = useMemo<ColumnDef<ProductRecord>[]>(
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
        id: "productType",
        header: "Type",
        enableSorting: false,
        cell: ({ row }) => row.original.productType?.name ?? "—",
      },
      {
        accessorKey: "quantity",
        header: "Quantity",
        cell: ({ row }) =>
          `${row.original.quantity} ${row.original.materialUnit?.name ?? ""}`.trim(),
      },
      {
        id: "order",
        header: "Order",
        enableSorting: false,
        cell: ({ row }) => row.original.order?.orderNumber ?? "—",
      },
      {
        id: "stage",
        header: "Stage",
        enableSorting: false,
        cell: ({ row }) => row.original.stage?.name ?? "—",
      },
      {
        id: "storedAt",
        header: "Stored at",
        enableSorting: false,
        cell: ({ row }) =>
          [
            row.original.storageRack?.storage?.location?.name ??
              row.original.storageRack?.storage?.code,
            row.original.storageRack?.code,
          ]
            .filter(Boolean)
            .join(" / ") || "—",
      },
      {
        accessorKey: "producedAt",
        header: "Produced",
        cell: ({ row }) =>
          row.original.producedAt
            ? new Date(row.original.producedAt).toLocaleDateString()
            : "—",
      },
      {
        id: "handover",
        header: "Handover",
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge label={row.original.handoverStatus ?? "produced"} />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <QrCodeDialog
              resource="products"
              id={row.original.id}
              code={row.original.code}
              title={row.original.name}
              trigger={
                <Button size="icon" variant="outline" title="QR kodu">
                  <QrCode className="h-4 w-4" />
                </Button>
              }
            />
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

  const table = useTable<ProductRecord>({
    columns,
    refineCoreProps: { resource: "products" },
  });

  return (
    <ListView>
      <ListViewHeader />
      <DataTable table={table} />
    </ListView>
  );
};
