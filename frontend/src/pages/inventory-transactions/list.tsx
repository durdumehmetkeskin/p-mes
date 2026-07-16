import { useOne } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { PackageX, User, Warehouse } from "lucide-react";

import { DataTable } from "@/components/refine-ui/data-table/data-table";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/refine-ui/status-badge";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const TYPE_TONE: Record<string, StatusTone> = {
  in: "success",
  out: "error",
  transfer: "info",
  transfer_in: "success",
  transfer_out: "warning",
  adjustment: "neutral",
  handover: "info",
  return: "warning",
};

type EndpointKind = "warehouse" | "user" | "external" | "none";
interface TxRecord {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  createdAt: string;
  material: { code: string; name?: string } | null;
  from: string;
  fromKind: EndpointKind;
  to: string;
  toKind: EndpointKind;
}
interface Slot {
  code?: string;
  lotNumber?: string;
}
interface TxDetail extends TxRecord {
  sourceWarehouse: Slot | null;
  sourceRack: Slot | null;
  sourceLot: Slot | null;
  targetWarehouse: Slot | null;
  targetRack: Slot | null;
  targetLot: Slot | null;
  deliveredAt: string | null;
  receivedAt: string | null;
}

/** Icon by endpoint kind so warehouse↔user↔external reads at a glance. */
function Endpoint({ label, kind }: { label: string; kind: EndpointKind }) {
  const Icon =
    kind === "user" ? User : kind === "warehouse" ? Warehouse : kind === "external" ? PackageX : null;
  return (
    <span className="inline-flex items-center gap-1.5">
      {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
      <span>{label}</span>
    </span>
  );
}

const slotLabel = (
  wh: Slot | null,
  rack: Slot | null,
  lot: Slot | null,
): string =>
  [wh?.code, rack?.code, lot?.lotNumber].filter(Boolean).join(" / ") || "—";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b py-2 last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 break-words">{children}</span>
    </div>
  );
}

/** Detail Sheet for a stock movement (fetches source/target slots + full note). */
function MovementSheet({
  row,
  onClose,
}: {
  row: TxRecord | null;
  onClose: () => void;
}) {
  const { result: full } = useOne<TxDetail>({
    resource: "inventory-transactions",
    id: row?.id ?? "",
    queryOptions: { enabled: !!row },
    errorNotification: false,
  });
  const d = full ?? row;

  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {row ? (
              <StatusBadge tone={TYPE_TONE[row.type] ?? "neutral"} label={row.type} />
            ) : null}
            <span className="font-mono">{row?.quantity}</span>
          </SheetTitle>
        </SheetHeader>
        {row ? (
          <div className="mt-4 flex flex-col gap-0">
            <Row label="Material">
              {row.material ? `${row.material.code}${row.material.name ? ` · ${row.material.name}` : ""}` : "—"}
            </Row>
            <Row label="Quantity">{row.quantity}</Row>
            <Row label="From">
              <Endpoint label={row.from} kind={row.fromKind} />
            </Row>
            <Row label="To">
              <Endpoint label={row.to} kind={row.toKind} />
            </Row>
            {(full?.sourceWarehouse || full?.sourceRack || full?.sourceLot) && (
              <Row label="Source slot">
                {slotLabel(full.sourceWarehouse, full.sourceRack, full.sourceLot)}
              </Row>
            )}
            {(full?.targetWarehouse || full?.targetRack || full?.targetLot) && (
              <Row label="Target slot">
                {slotLabel(full.targetWarehouse, full.targetRack, full.targetLot)}
              </Row>
            )}
            {full?.deliveredAt ? (
              <Row label="Delivered">{new Date(full.deliveredAt).toLocaleString()}</Row>
            ) : null}
            {full?.receivedAt ? (
              <Row label="Received">{new Date(full.receivedAt).toLocaleString()}</Row>
            ) : null}
            <Row label="When">{new Date(row.createdAt).toLocaleString()}</Row>
            <Row label="Note">{d?.note ?? "—"}</Row>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export const InventoryTransactionsList = () => {
  const [selected, setSelected] = useState<TxRecord | null>(null);
  const columns = useMemo<ColumnDef<TxRecord>[]>(
    () => [
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ getValue }) => {
          const t = getValue() as string;
          return <StatusBadge tone={TYPE_TONE[t] ?? "neutral"} label={t} />;
        },
      },
      {
        id: "material",
        header: "Material",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-primary">
            {row.original.material?.code ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() as number}</span>
        ),
      },
      {
        id: "source",
        header: "From",
        enableSorting: false,
        cell: ({ row }) => (
          <Endpoint label={row.original.from} kind={row.original.fromKind} />
        ),
      },
      {
        id: "target",
        header: "To",
        enableSorting: false,
        cell: ({ row }) => (
          <Endpoint label={row.original.to} kind={row.original.toKind} />
        ),
      },
      {
        accessorKey: "createdAt",
        header: "When",
        cell: ({ getValue }) =>
          new Date(getValue() as string).toLocaleString(),
      },
      {
        accessorKey: "note",
        header: "Note",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="line-clamp-1">{(getValue() as string) ?? "—"}</span>
        ),
      },
    ],
    [],
  );

  const table = useTable<TxRecord>({
    columns,
    refineCoreProps: { resource: "inventory-transactions" },
  });

  return (
    <ListView>
      {/* Movements are immutable and created from the Materials page. */}
      <ListViewHeader canCreate={false} />
      <DataTable table={table} onRowClick={setSelected} />
      <MovementSheet row={selected} onClose={() => setSelected(null)} />
    </ListView>
  );
};
