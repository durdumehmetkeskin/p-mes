import { useGo, useList, useResourceParams, useShow } from "@refinedev/core";

import { QrCodeDialog } from "@/components/qr/qr-code-dialog";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { RouteShowSheet } from "@/components/refine-ui/views/route-show-sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AddLotDialog } from "./add-lot-dialog";

interface MaterialRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  dangerWeeks: number | null;
  warningWeeks: number | null;
  isActive: boolean;
  isLotTracked: boolean;
  isSerialTracked: boolean;
  materialType: { id: string; name: string } | null;
  materialUnit: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface Slot {
  code?: string;
}
interface BalanceRow {
  id: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  warehouseId: string;
  rackId: string | null;
  lotId: string | null;
  warehouse: Slot | null;
  rack: Slot | null;
  lot: { lotNumber: string } | null;
}
interface ReservedItemRow {
  id: string;
  quantity: number;
  warehouse: Slot | null;
  rack: Slot | null;
  lot: { lotNumber: string } | null;
  order: { orderNumber: string } | null;
  stage: { name: string } | null;
}
interface LotRow {
  id: string;
  lotNumber: string;
  expiryDate: string | null;
  status: string;
  rack: Slot | null;
}
interface MovementRow {
  id: string;
  type: string;
  quantity: number;
  createdAt: string;
  note: string | null;
  sourceWarehouse: Slot | null;
  sourceRack: Slot | null;
  targetWarehouse: Slot | null;
  targetRack: Slot | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

function slot(wh: Slot | null, loc: Slot | null): string {
  if (!wh && !loc) return "—";
  return [wh?.code, loc?.code].filter(Boolean).join(" / ");
}

export const MaterialsShow = () => {
  const { id } = useResourceParams();
  const { query } = useShow<MaterialRecord>();
  const record = query.data?.data;
  const isLoading = query.isLoading;
  const unit = record?.materialUnit?.name ?? "";

  const { result: balances } = useList<BalanceRow>({
    resource: "inventory-balances",
    filters: [{ field: "materialId", operator: "eq", value: id }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(id) },
  });

  const { result: movements } = useList<MovementRow>({
    resource: "inventory-transactions",
    filters: [{ field: "materialId", operator: "eq", value: id }],
    sorters: [{ field: "createdAt", order: "desc" }],
    pagination: { pageSize: 20 },
    queryOptions: { enabled: Boolean(id) },
  });

  const { result: reservedItems } = useList<ReservedItemRow>({
    resource: "stock-items",
    filters: [
      { field: "materialId", operator: "eq", value: id },
      { field: "status", operator: "eq", value: "reserved" },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(id) },
  });

  const { result: lots } = useList<LotRow>({
    resource: "lots",
    filters: [{ field: "materialId", operator: "eq", value: id }],
    sorters: [{ field: "lotNumber", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(id) },
  });
  const lotRows = lots?.data ?? [];

  const go = useGo();
  const reservedRows = reservedItems?.data ?? [];

  const balanceRows = balances?.data ?? [];
  const totalOnHand = balanceRows.reduce((s, b) => s + (b.currentStock ?? 0), 0);
  const totalAvailable = balanceRows.reduce(
    (s, b) => s + (b.availableStock ?? 0),
    0,
  );

  return (
    <RouteShowSheet title={record ? `${record.code} · ${record.name}` : "Material"}>
      {record && (
        <div className="flex justify-end">
          <QrCodeDialog
            resource="materials"
            id={record.id}
            code={record.code}
            title={record.name}
          />
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading || !record ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : (
            <>
              <Field label="Code">{record.code}</Field>
              <Field label="Name">{record.name}</Field>
              <Field label="Description">{record.description ?? "—"}</Field>
              <Field label="Type">{record.materialType?.name ?? "—"}</Field>
              <Field label="Unit">{record.materialUnit?.name ?? "—"}</Field>
              <Field label="Tracking">
                <span className="flex flex-wrap gap-1">
                  {record.isLotTracked && <Badge variant="outline">lot</Badge>}
                  {record.isSerialTracked && (
                    <Badge variant="outline">serial</Badge>
                  )}
                  {!record.isLotTracked && !record.isSerialTracked && "—"}
                </span>
              </Field>
              <Field label="Expiry thresholds">
                {record.dangerWeeks != null || record.warningWeeks != null
                  ? `Danger < ${record.dangerWeeks ?? "—"} wk · Warning < ${record.warningWeeks ?? "—"} wk`
                  : "—"}
              </Field>
              <Field label="Status">
                <StatusBadge
                  tone={record.isActive ? "success" : "neutral"}
                  label={record.isActive ? "Active" : "Inactive"}
                />
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stock by warehouse / rack / lot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span>Stock by rack</span>
            <span className="text-sm font-normal text-muted-foreground">
              On hand {totalOnHand} {unit} · Available {totalAvailable} {unit}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balanceRows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Warehouse</th>
                  <th className="pb-2 font-medium">Rack</th>
                  <th className="pb-2 font-medium">Lot</th>
                  <th className="pb-2 font-medium text-right">Current</th>
                  <th className="pb-2 font-medium text-right">Reserved</th>
                  <th className="pb-2 font-medium text-right">Available</th>
                </tr>
              </thead>
              <tbody>
                {balanceRows.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2">{b.warehouse?.code ?? "—"}</td>
                    <td className="py-2">{b.rack?.code ?? "—"}</td>
                    <td className="py-2">{b.lot?.lotNumber ?? "—"}</td>
                    <td className="py-2 text-right">{b.currentStock}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {b.reservedStock}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {b.availableStock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No stock recorded for this material.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lots of this material */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span>Lots</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-normal text-muted-foreground">
                {lotRows.length} total
              </span>
              {record && (
                <AddLotDialog
                  material={{ id: record.id, code: record.code }}
                />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lotRows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Lot number</th>
                  <th className="pb-2 font-medium">Rack</th>
                  <th className="pb-2 font-medium">Expiry</th>
                  <th className="pb-2 font-medium">Expiry status</th>
                </tr>
              </thead>
              <tbody>
                {lotRows.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() =>
                      go({ to: { resource: "lots", action: "show", id: l.id } })
                    }
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-2">{l.lotNumber}</td>
                    <td className="py-2">{l.rack?.code ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">
                      {l.expiryDate ?? "—"}
                    </td>
                    <td className="py-2">
                      <StatusBadge label={String(l.status).replace(/_/g, " ")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No lots for this material yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reserved stock items for this material (managed on the lot page) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Reserved stock</span>
            <span className="text-sm font-normal text-muted-foreground">
              {reservedRows.length} reserved
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reservedRows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Lot</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {reservedRows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">{r.lot?.lotNumber ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">
                      {[r.warehouse?.code, r.rack?.code]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </td>
                    <td className="py-2">{r.order?.orderNumber ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">
                      {r.stage?.name ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      {r.quantity} {unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No reserved stock for this material.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stock movements for this material */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock movements</CardTitle>
        </CardHeader>
        <CardContent>
          {movements?.data?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">From</th>
                  <th className="pb-2 font-medium">To</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.data.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2">
                      <StatusBadge label={String(m.type).replace(/_/g, " ")} />
                    </td>
                    <td className="py-2">
                      {slot(m.sourceWarehouse, m.sourceRack)}
                    </td>
                    <td className="py-2">
                      {slot(m.targetWarehouse, m.targetRack)}
                    </td>
                    <td className="py-2 text-right">{m.quantity}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {m.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No movements for this material yet.
            </p>
          )}
        </CardContent>
      </Card>
    </RouteShowSheet>
  );
};
