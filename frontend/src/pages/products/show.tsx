import { useList, useNotification, useShow } from "@refinedev/core";
import { useState } from "react";

import { QrCodeDialog } from "@/components/qr/qr-code-dialog";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { RouteShowSheet } from "@/components/refine-ui/views/route-show-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";

interface ProductRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  quantity: number;
  producedAt: string | null;
  note: string | null;
  productType: { id: string; name: string } | null;
  materialUnit: { id: string; name: string } | null;
  order: { id: string; orderNumber: string; name?: string } | null;
  process: { id: string } | null;
  stage: { id: string; name: string } | null;
  consumedByStage: { id: string; name: string } | null;
  storageRack: {
    id: string;
    code: string;
    storage?: {
      id: string;
      code: string;
      location?: { id: string; code: string; name: string } | null;
    } | null;
  } | null;
  producedByUser: { id: string; name: string } | null;
  handoverStatus: "produced" | "delivering" | "received";
  deliveredByUser: { id: string; name: string } | null;
  deliveredAt: string | null;
  receivedByUser: { id: string; name: string } | null;
  receivedAt: string | null;
  createdAt: string;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b py-2 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

export const ProductsShow = () => {
  const { query } = useShow<ProductRecord>();
  const record = query.data?.data;
  const isLoading = query.isLoading;
  const { open: notify } = useNotification();
  const [busy, setBusy] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [locId, setLocId] = useState("");
  const [rackId, setRackId] = useState("");

  const { result: locations } = useList<{ id: string; code: string; name: string }>({
    resource: "locations",
    pagination: { mode: "off" },
    queryOptions: { enabled: storeOpen },
    errorNotification: false,
  });
  const { result: racks } = useList<{
    id: string;
    code: string;
    storage?: { locationId: string } | null;
  }>({
    resource: "storage-racks",
    pagination: { mode: "off" },
    queryOptions: { enabled: storeOpen },
    errorNotification: false,
  });
  const rackOptions = (racks?.data ?? []).filter(
    (r) => r.storage?.locationId === locId,
  );

  // ONE-SIDED drop-off: any user shelves the product on a location-storage
  // rack (no warehouse responsible in the loop; backend scopes by project).
  const store = async () => {
    if (!record || !rackId) return;
    setBusy(true);
    try {
      await axiosInstance.post(`/products/${record.id}/store`, {
        storageRackId: rackId,
      });
      setStoreOpen(false);
      await query.refetch();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "İşlem başarısız";
      notify?.({ type: "error", message: String(msg) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <RouteShowSheet
      title={record ? `${record.code} · ${record.name}` : "Product"}
    >
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
              {/* Handover state + one-sided drop-off + QR */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={String(record.handoverStatus ?? "produced")}
                />
                {record.handoverStatus !== "received" && (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => setStoreOpen(true)}
                  >
                    Depoya bırak
                  </Button>
                )}
                <QrCodeDialog
                  resource="products"
                  id={record.id}
                  code={record.code}
                  title={record.name}
                />
              </div>
              <Field label="Code">{record.code}</Field>
              <Field label="Name">{record.name}</Field>
              <Field label="Description">{record.description ?? "—"}</Field>
              <Field label="Type">{record.productType?.name ?? "—"}</Field>
              <Field label="Quantity">
                {record.quantity} {record.materialUnit?.name ?? ""}
              </Field>
              <Field label="Order">{record.order?.orderNumber ?? "—"}</Field>
              <Field label="Produced by stage">
                {record.stage?.name ?? "—"}
              </Field>
              <Field label="Used as input at">
                {record.consumedByStage?.name ?? "—"}
              </Field>
              <Field label="Stored at">
                {[
                  record.storageRack?.storage?.location?.name ??
                    record.storageRack?.storage?.code,
                  record.storageRack?.code,
                ]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </Field>
              <Field label="Produced at">
                {record.producedAt
                  ? new Date(record.producedAt).toLocaleString()
                  : "—"}
              </Field>
              <Field label="Produced by">
                {record.producedByUser?.name ?? "—"}
              </Field>
              <Field label="Delivered">
                {record.deliveredAt
                  ? `${record.deliveredByUser?.name ?? "—"} · ${new Date(record.deliveredAt).toLocaleString()}`
                  : "—"}
              </Field>
              <Field label="Received">
                {record.receivedAt
                  ? `${record.receivedByUser?.name ?? "—"} · ${new Date(record.receivedAt).toLocaleString()}`
                  : "—"}
              </Field>
              <Field label="Note">{record.note ?? "—"}</Field>
            </>
          )}
        </CardContent>
      </Card>
      {/* One-sided drop-off: pick a location's storage rack, then store. */}
      <Dialog open={storeOpen} onOpenChange={setStoreOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Depoya bırak</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <Label>Lokasyon</Label>
              <Select
                value={locId}
                onValueChange={(v) => {
                  setLocId(v);
                  setRackId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Lokasyon seçin" />
                </SelectTrigger>
                <SelectContent>
                  {(locations?.data ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.code} · {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Raf</Label>
              <Select value={rackId} onValueChange={setRackId} disabled={!locId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={locId ? "Raf seçin" : "Önce lokasyon seçin"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {rackOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button disabled={!rackId || busy} onClick={() => void store()}>
                {busy ? "Kaydediliyor…" : "Depoya bırak"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </RouteShowSheet>
  );
};
