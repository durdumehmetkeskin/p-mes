import { useList, useNotification, useShow } from "@refinedev/core";
import {
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Factory,
  Undo2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

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
  originStageName: string | null;
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

interface JourneyEnvironment {
  from: string;
  to: string;
  count: number;
  tempMin: number | null;
  tempMax: number | null;
  tempAvg: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
  humidityAvg: number | null;
}
interface JourneyEvent {
  type: "produced" | "stored" | "received" | "processed" | "released";
  at: string;
  stageName: string | null;
  user: string | null;
  location: string | null;
  /** "Location · Section" the stage ran in (from its section reservation). */
  section?: string | null;
  /** Temp/humidity summary over the operation window. */
  environment?: JourneyEnvironment | null;
}

const EVENT_META: Record<
  JourneyEvent["type"],
  { label: string; icon: LucideIcon; cls: string }
> = {
  produced: { label: "Üretildi", icon: Factory, cls: "text-sky-400" },
  stored: { label: "Depoya bırakıldı", icon: Boxes, cls: "text-muted-foreground" },
  received: { label: "Teslim alındı", icon: UserCheck, cls: "text-sky-400" },
  processed: { label: "İşlendi", icon: CheckCircle2, cls: "text-emerald-500" },
  released: { label: "Serbest bırakıldı", icon: Undo2, cls: "text-muted-foreground" },
};

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

  // Processing journey — which stage, by whom, where, when (per event).
  const [journey, setJourney] = useState<JourneyEvent[] | null>(null);
  // Expanded rows (section + environment dropdown per stage step).
  const [expandedIdx, setExpandedIdx] = useState<Set<number>>(new Set());
  const toggleExpanded = (i: number) =>
    setExpandedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  useEffect(() => {
    if (!record?.id) return;
    let mounted = true;
    axiosInstance
      .get<JourneyEvent[]>(`/products/${record.id}/journey`)
      .then((r) => mounted && setJourney(Array.isArray(r.data) ? r.data : []))
      .catch(() => mounted && setJourney([]));
    return () => {
      mounted = false;
    };
  }, [record?.id]);

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
              <Field label="Üretildiği aşama">
                {record.originStageName ?? record.stage?.name ?? "—"}
              </Field>
              <Field label="Şu anki aşama">{record.stage?.name ?? "—"}</Field>
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

              {/* İşlem geçmişi — the product's journey through the stages. */}
              <div className="mt-4">
                <div className="mb-1 text-sm font-semibold">İşlem Geçmişi</div>
                {journey === null ? (
                  <Skeleton className="h-16 w-full" />
                ) : journey.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Henüz kayıtlı işlem yok.
                  </p>
                ) : (
                  <ul className="divide-y text-sm">
                    {journey.map((e, i) => {
                      const meta = EVENT_META[e.type];
                      const Icon = meta.icon;
                      const expandable = Boolean(e.section || e.environment);
                      const isOpen = expandedIdx.has(i);
                      const env = e.environment;
                      return (
                        <li key={`${e.type}-${e.at}-${i}`} className="py-2">
                          <button
                            type="button"
                            disabled={!expandable}
                            onClick={() => toggleExpanded(i)}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <Icon className={`size-4 shrink-0 ${meta.cls}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">
                                {meta.label}
                                {e.stageName ? ` — ${e.stageName}` : ""}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {[
                                  e.user ? `Kişi: ${e.user}` : null,
                                  e.section ? `Bölüm: ${e.section}` : null,
                                  e.location ? `Raf: ${e.location}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </span>
                            </span>
                            <span className="shrink-0 font-mono text-xs text-muted-foreground">
                              {new Date(e.at).toLocaleString()}
                            </span>
                            {expandable &&
                              (isOpen ? (
                                <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                              ))}
                          </button>
                          {/* Dropdown: WHERE the stage ran (section) + the
                              temp/humidity over the operation window. */}
                          {expandable && isOpen && (
                            <div className="mt-2 space-y-1 rounded-md border bg-muted/30 p-2 text-xs">
                              {e.section && <div>Bölüm: {e.section}</div>}
                              {env && (
                                <>
                                  <div className="text-muted-foreground">
                                    Aralık: {new Date(env.from).toLocaleString()}{" "}
                                    → {new Date(env.to).toLocaleString()}
                                  </div>
                                  {env.count > 0 ? (
                                    <>
                                      <div>
                                        Sıcaklık: {env.tempMin ?? "—"}–
                                        {env.tempMax ?? "—"} °C (ort{" "}
                                        {env.tempAvg ?? "—"} °C)
                                      </div>
                                      <div>
                                        Nem: %{env.humidityMin ?? "—"}–%
                                        {env.humidityMax ?? "—"} (ort %
                                        {env.humidityAvg ?? "—"})
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-muted-foreground">
                                      Bu aralıkta sensör kaydı yok.
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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
