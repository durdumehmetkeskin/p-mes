import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { EditButton } from "@/components/refine-ui/buttons/edit";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { StockActionsToolbar } from "@/components/inventory/stock-actions-toolbar";

interface BalanceRecord {
  id: string;
  quantity: number;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  material: { code: string; name: string } | null;
  warehouse: { code: string } | null;
  rack: { code: string } | null;
  lot: { lotNumber: string } | null;
}

export const InventoryBalancesList = () => {
  const columns = useMemo<ColumnDef<BalanceRecord>[]>(
    () => [
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
        id: "warehouse",
        header: "Warehouse",
        enableSorting: false,
        cell: ({ row }) => row.original.warehouse?.code ?? "—",
      },
      {
        id: "rack",
        header: "Rack",
        enableSorting: false,
        cell: ({ row }) => row.original.rack?.code ?? "—",
      },
      {
        id: "lot",
        header: "Lot",
        enableSorting: false,
        cell: ({ row }) => row.original.lot?.lotNumber ?? "—",
      },
      {
        accessorKey: "currentStock",
        header: "Current",
        enableSorting: false,
        cell: ({ row }) => row.original.currentStock ?? row.original.quantity,
      },
      {
        accessorKey: "reservedStock",
        header: "Reserved",
        enableSorting: false,
        cell: ({ row }) => row.original.reservedStock ?? 0,
      },
      {
        accessorKey: "availableStock",
        header: "Available",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.availableStock ?? row.original.quantity}
          </span>
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
            <DeleteButton size="icon" recordItemId={row.original.id}>
              <Trash2 className="h-4 w-4" />
            </DeleteButton>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useTable<BalanceRecord>({
    columns,
    refineCoreProps: { resource: "inventory-balances" },
  });

  return (
    <ListView>
      <ListViewHeader />
      <StockActionsToolbar />
      <DataTable table={table} />
    </ListView>
  );
};
