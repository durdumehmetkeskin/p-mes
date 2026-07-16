import {
  useInvalidate,
  useList,
  useNotification,
  useResourceParams,
  useShow,
} from "@refinedev/core";
import { PackagePlus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { AxiosError } from "axios";

import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { RouteShowSheet } from "@/components/refine-ui/views/route-show-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCodeDialog } from "@/components/qr/qr-code-dialog";
import { ReceiveReturnDialog } from "@/components/inventory/receive-return-dialog";
import { axiosInstance } from "@/providers/axios";
import { useIsAdmin } from "@/hooks/use-is-admin";

const NONE = "__none__";
const REFRESH = ["stock-items", "inventory-balances", "lots"];

interface LotRecord {
  id: string;
  lotNumber: string;
  expiryDate: string | null;
  status: string;
  material: { id: string; code: string; name: string } | null;
  customer: { id: string; name: string } | null;
  project: { id: string; name: string; code?: string } | null;
  projectId: string | null;
}
interface StockItemRow {
  id: string;
  quantity: number;
  note: string | null;
  rackId: string | null;
  status:
    | "available"
    | "reserving"
    | "reserved"
    | "delivering"
    | "delivered"
    | "returning"
    | "consumed";
  warehouseId: string;
  warehouse: { code: string } | null;
  rack: { code: string; order: { id: string; orderNumber: string } | null } | null;
  order: { orderNumber: string } | null;
  stage: { name: string } | null;
}
interface Opt {
  id: string;
  code?: string;
  name?: string;
}
interface OrderOpt {
  id: string;
  orderNumber: string;
  name: string | null;
}
interface StageOpt {
  id: string;
  name: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

/** Add an available stock item to this lot. */
function AddStockItemDialog({ lotId }: { lotId: string }) {
  const { open: notify } = useNotification();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [rackId, setRackId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);

  const { result: warehouses } = useList<Opt>({
    resource: "warehouses",
    pagination: { mode: "off" },
  });
  const { result: racks } = useList<Opt & { zone?: { code?: string; warehouse?: { code?: string } | null } | null }>({
    resource: "racks",
    pagination: { mode: "off" },
  });

  const submit = async () => {
    const qty = Number(quantity);
    if (!warehouseId || !qty || qty <= 0) {
      notify?.({ type: "error", message: "Warehouse and a positive quantity are required" });
      return;
    }
    setBusy(true);
    try {
      await axiosInstance.post("/stock-items", {
        lotId,
        warehouseId,
        rackId: rackId ?? undefined,
        quantity: qty,
      });
      REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
      notify?.({ type: "success", message: "Stock item added" });
      setOpen(false);
      setWarehouseId("");
      setRackId(null);
      setQuantity("");
    } catch (err) {
      const msg = (err as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
      notify?.({ type: "error", message: Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PackagePlus className="mr-2 h-4 w-4" />
          Add stock item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add stock item</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {(warehouses?.data ?? []).map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {[w.code, w.name].filter(Boolean).join(" · ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Rack (optional)</Label>
            <Select value={rackId ?? NONE} onValueChange={(v) => setRackId(v === NONE ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a rack" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— None —</SelectItem>
                {(racks?.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.zone ? `${[r.zone.warehouse?.code, r.zone.code].filter(Boolean).join(" / ")} / ` : ""}
                    {r.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Quantity</Label>
            <Input type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={() => void submit()}>
            {busy ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Edit an available stock item: quantity, location (warehouse/rack), note. */
function EditStockItemDialog({ item }: { item: StockItemRow }) {
  const { open: notify } = useNotification();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState(item.warehouseId);
  const [rackId, setRackId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [note, setNote] = useState(item.note ?? "");
  const [busy, setBusy] = useState(false);

  const { result: warehouses } = useList<Opt>({
    resource: "warehouses",
    pagination: { mode: "off" },
    queryOptions: { enabled: open },
  });
  const { result: racks } = useList<Opt & { zone?: { code?: string; warehouse?: { code?: string } | null } | null }>({
    resource: "racks",
    pagination: { mode: "off" },
    queryOptions: { enabled: open },
  });

  // Re-seed the form from the row each time the dialog opens.
  const onOpenChange = (next: boolean) => {
    if (next) {
      setWarehouseId(item.warehouseId);
      setRackId(item.rackId ?? null);
      setQuantity(String(item.quantity));
      setNote(item.note ?? "");
    }
    setOpen(next);
  };

  const submit = async () => {
    const qty = Number(quantity);
    if (!warehouseId || !qty || qty <= 0) {
      notify?.({ type: "error", message: "Warehouse and a positive quantity are required" });
      return;
    }
    setBusy(true);
    try {
      await axiosInstance.patch(`/stock-items/${item.id}`, {
        warehouseId,
        rackId,
        quantity: qty,
        note: note.trim() || null,
      });
      REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
      notify?.({ type: "success", message: "Stock item updated" });
      setOpen(false);
    } catch (err) {
      const msg = (err as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
      notify?.({ type: "error", message: Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit stock item</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {(warehouses?.data ?? []).map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {[w.code, w.name].filter(Boolean).join(" · ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Rack (optional)</Label>
            <Select value={rackId ?? NONE} onValueChange={(v) => setRackId(v === NONE ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a rack" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— None —</SelectItem>
                {(racks?.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.zone ? `${[r.zone.warehouse?.code, r.zone.code].filter(Boolean).join(" / ")} / ` : ""}
                    {r.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Quantity</Label>
            <Input type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={() => void submit()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Reserve an available stock item for an order (+ optional stage). */
function ReserveDialog({
  item,
  projectId,
}: {
  item: StockItemRow;
  projectId: string | null;
}) {
  const { open: notify } = useNotification();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  // If the item's rack is dedicated to an order, that order is the only valid one.
  const [orderId, setOrderId] = useState(item.rack?.order?.id ?? "");
  const [stageId, setStageId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageOpt[]>([]);
  const [busy, setBusy] = useState(false);

  const { result: orders } = useList<OrderOpt>({
    resource: "orders",
    pagination: { mode: "off" },
    filters: projectId ? [{ field: "projectId", operator: "eq", value: projectId }] : [],
    queryOptions: { enabled: open && Boolean(projectId) },
  });

  // Load the chosen order's stages for the optional stage picker.
  useEffect(() => {
    setStageId(null);
    setStages([]);
    if (!orderId) return;
    let active = true;
    void axiosInstance
      .get<StageOpt[]>(`/orders/${orderId}/stages`)
      .then((r) => {
        if (active) setStages(r.data ?? []);
      })
      .catch(() => {
        if (active) setStages([]);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  const submit = async () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0 || qty > item.quantity) {
      notify?.({ type: "error", message: `Enter a quantity between 1 and ${item.quantity}` });
      return;
    }
    if (!orderId) {
      notify?.({ type: "error", message: "Select an order" });
      return;
    }
    setBusy(true);
    try {
      await axiosInstance.post(`/stock-items/${item.id}/reserve`, {
        quantity: qty,
        orderId,
        stageId: stageId ?? undefined,
      });
      REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
      notify?.({ type: "success", message: "Reservation requested" });
      setOpen(false);
      setQuantity("");
      setOrderId("");
      setStageId(null);
    } catch (err) {
      const msg = (err as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
      notify?.({ type: "error", message: Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!projectId}>
          Reserve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reserve stock ({item.quantity} available)</DialogTitle>
        </DialogHeader>
        {!projectId ? (
          <p className="text-sm text-muted-foreground">
            Assign a project to this lot before reserving.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Quantity</Label>
              <Input type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Order</Label>
              <Select value={orderId} onValueChange={setOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  {(orders?.data ?? []).map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.orderNumber}
                      {o.name ? ` · ${o.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Stage (optional)</Label>
              <Select
                value={stageId ?? NONE}
                onValueChange={(v) => setStageId(v === NONE ? null : v)}
                disabled={!orderId || stages.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={orderId ? "Select a stage" : "Select an order first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button disabled={busy || !projectId} onClick={() => void submit()}>
            {busy ? "Reserving…" : "Reserve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const statusTone = (s: string) =>
  s === "available" || s === "delivered"
    ? "success"
    : s === "reserving" || s === "delivering"
      ? "info"
      : s === "reserved" || s === "returning"
        ? "warning"
        : "neutral";

export const LotsShow = () => {
  const { id: rawId } = useResourceParams();
  const id = rawId ? String(rawId) : undefined;
  const { query } = useShow<LotRecord>();
  const record = query.data?.data;
  const isLoading = query.isLoading;

  const { open: notify } = useNotification();
  const invalidate = useInvalidate();
  const isAdmin = useIsAdmin();

  const { result: items } = useList<StockItemRow>({
    resource: "stock-items",
    filters: [{ field: "lotId", operator: "eq", value: id }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(id) },
  });
  const rows = items?.data ?? [];

  const action = async (
    itemId: string,
    verb:
      | "release"
      | "consume"
      | "confirm-reserve"
      | "deliver"
      | "receive"
      | "return",
  ) => {
    try {
      await axiosInstance.post(`/stock-items/${itemId}/${verb}`);
      REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
      const messages: Record<typeof verb, string> = {
        release: "Released",
        consume: "Consumed",
        "confirm-reserve": "Reserved",
        deliver: "Delivered",
        receive: "Received",
        return: "Returned to warehouse",
      };
      notify?.({ type: "success", message: messages[verb] });
    } catch (err) {
      const msg = (err as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
      notify?.({ type: "error", message: Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error") });
    }
  };

  return (
    <RouteShowSheet
      title={record ? `Lot ${record.lotNumber}` : "Lot"}
    >
      <Card>
        <CardContent className="pt-6">
          {isLoading || !record ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : (
            <>
              <Field label="Material">
                {record.material ? `${record.material.code} · ${record.material.name}` : "—"}
              </Field>
              <Field label="Lot number">{record.lotNumber}</Field>
              <Field label="Expiry (SKT)">{record.expiryDate ?? "—"}</Field>
              <Field label="Customer">{record.customer?.name ?? "—"}</Field>
              <Field label="Project">
                {record.project ? [record.project.code, record.project.name].filter(Boolean).join(" · ") : "—"}
              </Field>
              <Field label="Expiry status">
                <StatusBadge label={record.status} />
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span>Stock items ({rows.length})</span>
            {id ? <AddStockItemDialog lotId={id} /> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="py-2 text-right font-mono">{it.quantity}</td>
                    <td className="py-2 text-muted-foreground">
                      {[it.warehouse?.code, it.rack?.code].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="py-2">
                      <StatusBadge tone={statusTone(it.status)} label={it.status} />
                    </td>
                    <td className="py-2">{it.order?.orderNumber ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">{it.stage?.name ?? "—"}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1">
                        <QrCodeDialog
                          resource="stock-items"
                          id={it.id}
                          code={record?.lotNumber ?? it.id}
                          title={
                            [it.warehouse?.code, it.rack?.code]
                              .filter(Boolean)
                              .join(" / ") || undefined
                          }
                        />
                        {it.status === "available" && (
                          <>
                            <EditStockItemDialog item={it} />
                            <ReserveDialog item={it} projectId={record?.projectId ?? null} />
                          </>
                        )}
                        {it.status === "reserving" && (
                          <>
                            <Button size="sm" variant="default" onClick={() => void action(it.id, "confirm-reserve")}>
                              Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void action(it.id, "release")}>
                              Cancel
                            </Button>
                          </>
                        )}
                        {it.status === "reserved" && (
                          <>
                            {isAdmin && (
                              <Button size="sm" variant="default" onClick={() => void action(it.id, "deliver")}>
                                Deliver
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => void action(it.id, "release")}>
                              Release
                            </Button>
                          </>
                        )}
                        {it.status === "delivering" && isAdmin && (
                          <Button size="sm" variant="default" onClick={() => void action(it.id, "receive")}>
                            Receive
                          </Button>
                        )}
                        {it.status === "delivered" && isAdmin && (
                          <Button size="sm" variant="default" onClick={() => void action(it.id, "return")}>
                            Return
                          </Button>
                        )}
                        {it.status === "returning" && isAdmin && (
                          <ReceiveReturnDialog item={it} />
                        )}
                        {/* Physical handover is QR-only for non-admins (done on mobile). */}
                        {!isAdmin &&
                          (it.status === "delivering" ||
                            it.status === "delivered" ||
                            it.status === "returning") && (
                            <span className="self-center text-xs text-muted-foreground">
                              Scan QR to hand over
                            </span>
                          )}
                        {(it.status === "available" ||
                          it.status === "reserved" ||
                          it.status === "delivered") && (
                          <Button size="sm" variant="outline" onClick={() => void action(it.id, "consume")}>
                            Consume
                          </Button>
                        )}
                        {it.status === "available" && (
                          <DeleteButton
                            resource="stock-items"
                            recordItemId={it.id}
                            size="sm"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                          </DeleteButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No stock items yet. Add one to bring stock into this lot.
            </p>
          )}
        </CardContent>
      </Card>
    </RouteShowSheet>
  );
};
