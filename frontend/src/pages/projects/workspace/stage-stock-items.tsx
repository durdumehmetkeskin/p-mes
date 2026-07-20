import { useApiUrl, useCustom, useNotification } from "@refinedev/core";
import { ArrowRightToLine, Undo2 } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { axiosInstance } from "@/providers/axios";

interface StageStockItem {
  id: string;
  quantity: number;
  status: string;
  lot: { id: string; lotNumber: string } | null;
  material: { id: string; code: string; name: string; unit: string } | null;
  warehouse: { code: string } | null;
  rack: { code: string } | null;
  deliveredBy: string | null;
  deliveredAt: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  returnedBy: string | null;
  returnedAt: string | null;
}
interface StageUsage {
  materialId: string;
  code: string;
  name: string;
  unit: string;
  used: number;
}

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString() : null;

interface PoolItem {
  id: string;
  quantity: number;
  status: string;
  lot: { id: string; lotNumber: string } | null;
  material: { id: string; code: string; name: string; unit: string } | null;
  warehouse: { code: string } | null;
  rack: { code: string } | null;
}

/**
 * Stock items reserved for this stage (reserving → delivered) + the order's
 * reserved POOL (reserved for the order, no stage yet): the stage/process
 * responsible can assign part or all of a pool item onto this stage, or send
 * a still-undelivered stage item back to the pool.
 */
export function StageStockItems({
  stageId,
  orderId,
  canAssign = false,
  canHandle = false,
}: {
  stageId: string;
  orderId?: string;
  /** Stage/process responsible or admin — may assign/unassign pool stock. */
  canAssign?: boolean;
  /** Stage workers (+ responsible/admin) — may return or consume a DELIVERED
   *  item; both are required before the stage can complete. */
  canHandle?: boolean;
}) {
  const apiUrl = useApiUrl();
  const { open } = useNotification();
  const { result, query } = useCustom<StageStockItem[]>({
    url: `${apiUrl}/process-stages/${stageId}/stock-items`,
    method: "get",
    // Don't toast on failure (e.g. endpoint not yet deployed) — show a line.
    errorNotification: false,
    queryOptions: { retry: false },
  });
  // useCustom's result.data is `{}` (EMPTY_OBJECT) while loading, so guard for
  // an actual array before mapping.
  const items = Array.isArray(result?.data) ? result.data : [];

  // The order's unassigned reserved pool — the source we assign from.
  const { result: poolRes, query: poolQuery } = useCustom<PoolItem[]>({
    url: `${apiUrl}/orders/${orderId}/stock-items`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false, enabled: Boolean(orderId) && canAssign },
  });
  const pool = Array.isArray(poolRes?.data) ? poolRes.data : [];
  // Per-row quantity drafts (default = full quantity).
  const [assignQty, setAssignQty] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const refreshBoth = async () => {
    await Promise.all([query.refetch(), poolQuery.refetch()]);
  };

  const assign = async (it: PoolItem) => {
    const raw = assignQty[it.id];
    const qty = raw === undefined || raw === "" ? it.quantity : Number(raw);
    if (!(qty > 0) || qty > it.quantity) {
      open?.({
        type: "error",
        message: `Miktar 0'dan büyük ve en fazla ${it.quantity} olmalı`,
      });
      return;
    }
    setBusyId(it.id);
    try {
      await axiosInstance.post(`/stock-items/${it.id}/assign-stage`, {
        stageId,
        quantity: qty === it.quantity ? undefined : qty,
      });
      setAssignQty((prev) => ({ ...prev, [it.id]: "" }));
      await refreshBoth();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Assignment failed";
      open?.({ type: "error", message: String(msg) });
    } finally {
      setBusyId(null);
    }
  };

  const unassign = async (id: string) => {
    setBusyId(id);
    try {
      await axiosInstance.post(`/stock-items/${id}/unassign-stage`);
      await refreshBoth();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Unassign failed";
      open?.({ type: "error", message: String(msg) });
    } finally {
      setBusyId(null);
    }
  };

  // Delivered-item exits before completion: return the leftover to the
  // warehouse, or mark the whole quantity consumed at this stage.
  const handle = async (id: string, verb: "return" | "consume-delivered") => {
    setBusyId(id);
    try {
      await axiosInstance.post(`/stock-items/${id}/${verb}`);
      await refreshBoth();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Action failed";
      open?.({ type: "error", message: String(msg) });
    } finally {
      setBusyId(null);
    }
  };

  const { result: usageRes } = useCustom<StageUsage[]>({
    url: `${apiUrl}/process-stages/${stageId}/material-usage`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const usage = Array.isArray(usageRes?.data) ? usageRes.data : [];

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="text-sm font-medium">Stage materials</div>
      <p className="text-xs text-muted-foreground">
        Assign reserved order stock to this stage, send it back, and track what
        was consumed here.
      </p>

      {/* Assigned: reserved for THIS stage (reservation → handover). */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Assigned to this stage ({items.length})
        </div>
        {query.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : query.isError ? (
          <p className="text-xs text-muted-foreground">
            Could not load reserved materials.
          </p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No materials reserved for this stage yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => {
              const loc = [it.warehouse?.code, it.rack?.code]
                .filter(Boolean)
                .join(" / ");
              const delivered = fmtDate(it.deliveredAt);
              const received = fmtDate(it.receivedAt);
              const returned = fmtDate(it.returnedAt);
              return (
                <li
                  key={it.id}
                  className="flex flex-col gap-1 rounded border p-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {it.material
                        ? `${it.material.code} · ${it.material.name}`
                        : "—"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {it.quantity}
                        {it.material?.unit ? ` ${it.material.unit}` : ""}
                      </span>
                      <StatusBadge
                        label={String(it.status).replace(/_/g, " ")}
                      />
                      {canAssign &&
                        (it.status === "reserving" ||
                          it.status === "reserved") && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6"
                            disabled={busyId === it.id}
                            title="Return to the order pool"
                            onClick={() => void unassign(it.id)}
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      {canHandle && it.status === "delivered" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            disabled={busyId === it.id}
                            title="Return the leftover to the warehouse"
                            onClick={() => void handle(it.id, "return")}
                          >
                            Return
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            disabled={busyId === it.id}
                            title="Mark the whole quantity consumed at this stage"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Malzemenin tamamı bu aşamada kullanıldı olarak kaydedilecek. Emin misiniz?",
                                )
                              ) {
                                void handle(it.id, "consume-delivered");
                              }
                            }}
                          >
                            Consumed
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {it.lot ? `Lot ${it.lot.lotNumber}` : "—"}
                    {loc ? ` · ${loc}` : ""}
                  </div>
                  {(delivered || received) && (
                    <div className="text-xs text-muted-foreground">
                      {delivered &&
                        `Delivered by ${it.deliveredBy ?? "—"} on ${delivered}`}
                      {delivered && received && " · "}
                      {received &&
                        `Received by ${it.receivedBy ?? "—"} on ${received}`}
                    </div>
                  )}
                  {returned && (
                    <div className="text-xs text-muted-foreground">
                      {`Returned by ${it.returnedBy ?? "—"} on ${returned}`}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Assignable: the order's reserved pool (no stage yet) — assign part
          or all of a row onto THIS stage. */}
      {canAssign && (
        <div className="space-y-2 border-t pt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Assignable from the order pool ({pool.length})
          </div>
          {pool.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No unassigned reserved stock for this order.
            </p>
          ) : (
            <ul className="space-y-2">
              {pool.map((it) => (
                <li
                  key={it.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {it.material
                        ? `${it.material.code} · ${it.material.name}`
                        : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {it.lot ? `Lot ${it.lot.lotNumber}` : "—"}
                      {[it.warehouse?.code, it.rack?.code]
                        .filter(Boolean)
                        .join(" / ")
                        ? ` · ${[it.warehouse?.code, it.rack?.code].filter(Boolean).join(" / ")}`
                        : ""}
                      {" · "}
                      <StatusBadge
                        label={String(it.status).replace(/_/g, " ")}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max={it.quantity}
                      step="0.001"
                      placeholder={String(it.quantity)}
                      value={assignQty[it.id] ?? ""}
                      onChange={(e) =>
                        setAssignQty((prev) => ({
                          ...prev,
                          [it.id]: e.target.value,
                        }))
                      }
                      className="h-8 w-24"
                    />
                    <span className="text-xs text-muted-foreground">
                      / {it.quantity}
                      {it.material?.unit ? ` ${it.material.unit}` : ""}
                    </span>
                    <Button
                      size="sm"
                      disabled={busyId === it.id}
                      onClick={() => void assign(it)}
                      title="Assign to this stage"
                    >
                      <ArrowRightToLine className="mr-1 h-4 w-4" />
                      Assign
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Consumption summary for this stage. */}
      <div className="space-y-2 border-t pt-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Used at this stage
        </div>
        {usage.length > 0 ? (
          <ul className="space-y-1">
            {usage.map((u) => (
              <li
                key={u.materialId}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {u.code} · {u.name}
                </span>
                <span className="font-mono text-muted-foreground">
                  {u.used}
                  {u.unit ? ` ${u.unit}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            No material consumed at this stage yet.
          </p>
        )}
      </div>
    </div>
  );
}
