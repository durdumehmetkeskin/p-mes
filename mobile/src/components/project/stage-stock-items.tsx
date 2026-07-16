import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useApiUrl, useCustom } from "@refinedev/core";
import { ArrowRightToLine, Undo2 } from "lucide-react-native";

import { SectionLabel } from "@/components/refine-ui/field-row";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

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
interface PoolItem {
  id: string;
  quantity: number;
  status: string;
  lot: { id: string; lotNumber: string } | null;
  material: { id: string; code: string; name: string; unit: string } | null;
  warehouse: { code: string } | null;
  rack: { code: string } | null;
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

/**
 * One merged "Stage materials" panel (mirrors the web): materials assigned to
 * this stage (with send-back for planners), the order's assignable reserved
 * pool (process responsible/admin only — workers just receive/return), and
 * the consumption summary.
 */
export function StageStockItems({
  stageId,
  orderId,
  canAssign = false,
}: {
  stageId: string;
  orderId?: string;
  /** Process responsible or admin — may assign/unassign pool stock. */
  canAssign?: boolean;
}) {
  const apiUrl = useApiUrl();
  const { result, query } = useCustom<StageStockItem[]>({
    url: `${apiUrl}/process-stages/${stageId}/stock-items`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const items = Array.isArray(result?.data) ? result.data : [];

  // The order's unassigned reserved pool — the source we assign from.
  const { result: poolRes, query: poolQuery } = useCustom<PoolItem[]>({
    url: `${apiUrl}/orders/${orderId}/stock-items`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false, enabled: Boolean(orderId) && canAssign },
  });
  const pool = Array.isArray(poolRes?.data) ? poolRes.data : [];
  const [assignQty, setAssignQty] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const { result: usageRes } = useCustom<StageUsage[]>({
    url: `${apiUrl}/process-stages/${stageId}/material-usage`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const usage = Array.isArray(usageRes?.data) ? usageRes.data : [];

  const refreshBoth = () =>
    Promise.all([query.refetch(), poolQuery.refetch()]);

  const fail = (err: { response?: { data?: { message?: string | string[] } } }) => {
    const msg = err?.response?.data?.message;
    Alert.alert("Failed", Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error"));
  };

  const assign = async (it: PoolItem) => {
    const raw = assignQty[it.id];
    const qty = raw === undefined || raw === "" ? it.quantity : Number(raw);
    if (!(qty > 0) || qty > it.quantity) {
      Alert.alert("Invalid quantity", `Must be > 0 and at most ${it.quantity}`);
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
      fail(e as never);
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
      fail(e as never);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View className="gap-3 rounded-lg border border-border bg-card p-4">
      <SectionLabel>Stage materials</SectionLabel>
      <Text className="text-xs text-muted-foreground">
        Assign reserved order stock to this stage, send it back, and track what
        was consumed here.
      </Text>

      {/* Assigned: reserved for THIS stage (reservation → handover). */}
      <View className="gap-2">
        <Text className="text-[10px] font-sans-semibold uppercase tracking-widest text-muted-foreground">
          Assigned to this stage ({items.length})
        </Text>
        {query.isLoading ? (
          <Text className="text-xs text-muted-foreground">Loading…</Text>
        ) : query.isError ? (
          <Text className="text-xs text-muted-foreground">
            Could not load reserved materials.
          </Text>
        ) : items.length === 0 ? (
          <Text className="text-xs text-muted-foreground">
            No materials reserved for this stage yet.
          </Text>
        ) : (
          items.map((it) => {
            const loc = [it.warehouse?.code, it.rack?.code]
              .filter(Boolean)
              .join(" / ");
            const delivered = fmtDate(it.deliveredAt);
            const received = fmtDate(it.receivedAt);
            const returned = fmtDate(it.returnedAt);
            return (
              <View
                key={it.id}
                className="gap-1 rounded-md border border-border p-2"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 pr-2 font-sans-medium text-sm text-foreground">
                    {it.material
                      ? `${it.material.code} · ${it.material.name}`
                      : "—"}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-mono text-xs text-muted-foreground">
                      {it.quantity}
                      {it.material?.unit ? ` ${it.material.unit}` : ""}
                    </Text>
                    <StatusBadge label={it.status} />
                    {canAssign &&
                    (it.status === "reserving" || it.status === "reserved") ? (
                      <Pressable
                        onPress={() => void unassign(it.id)}
                        disabled={busyId === it.id}
                        hitSlop={6}
                      >
                        <Icon icon={Undo2} size={16} color={colors.mutedForeground} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground">
                  {it.lot ? `Lot ${it.lot.lotNumber}` : "—"}
                  {loc ? ` · ${loc}` : ""}
                </Text>
                {delivered || received ? (
                  <Text className="text-xs text-muted-foreground">
                    {delivered
                      ? `Delivered by ${it.deliveredBy ?? "—"} on ${delivered}`
                      : ""}
                    {delivered && received ? " · " : ""}
                    {received
                      ? `Received by ${it.receivedBy ?? "—"} on ${received}`
                      : ""}
                  </Text>
                ) : null}
                {returned ? (
                  <Text className="text-xs text-muted-foreground">
                    {`Returned by ${it.returnedBy ?? "—"} on ${returned}`}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      {/* Assignable: the order's reserved pool (no stage yet). */}
      {canAssign ? (
        <View className="gap-2 border-t border-border pt-3">
          <Text className="text-[10px] font-sans-semibold uppercase tracking-widest text-muted-foreground">
            Assignable from the order pool ({pool.length})
          </Text>
          {pool.length === 0 ? (
            <Text className="text-xs text-muted-foreground">
              No unassigned reserved stock for this order.
            </Text>
          ) : (
            pool.map((it) => (
              <View
                key={it.id}
                className="gap-2 rounded-md border border-border p-2"
              >
                <Text className="font-sans-medium text-sm text-foreground">
                  {it.material
                    ? `${it.material.code} · ${it.material.name}`
                    : "—"}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {it.lot ? `Lot ${it.lot.lotNumber}` : "—"}
                  {[it.warehouse?.code, it.rack?.code].filter(Boolean).length
                    ? ` · ${[it.warehouse?.code, it.rack?.code].filter(Boolean).join(" / ")}`
                    : ""}
                </Text>
                <View className="flex-row items-center gap-2">
                  <View className="w-24">
                    <Input
                      value={assignQty[it.id] ?? ""}
                      onChangeText={(v) =>
                        setAssignQty((prev) => ({ ...prev, [it.id]: v }))
                      }
                      placeholder={String(it.quantity)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    / {it.quantity}
                    {it.material?.unit ? ` ${it.material.unit}` : ""}
                  </Text>
                  <Pressable
                    onPress={() => void assign(it)}
                    disabled={busyId === it.id}
                    className="ml-auto flex-row items-center gap-1 rounded-md border border-primary bg-primary px-3 py-1.5 active:opacity-80"
                  >
                    <Icon
                      icon={ArrowRightToLine}
                      size={14}
                      color={colors.primaryForeground}
                    />
                    <Text className="text-xs text-primary-foreground">Assign</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}

      {/* Consumption summary. */}
      <View className="gap-1 border-t border-border pt-3">
        <Text className="text-[10px] font-sans-semibold uppercase tracking-widest text-muted-foreground">
          Used at this stage
        </Text>
        {usage.length > 0 ? (
          usage.map((u) => (
            <View
              key={u.materialId}
              className="flex-row items-center justify-between"
            >
              <Text className="flex-1 pr-2 text-sm text-foreground">
                {u.code} · {u.name}
              </Text>
              <Text className="font-mono text-sm text-muted-foreground">
                {u.used}
                {u.unit ? ` ${u.unit}` : ""}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-xs text-muted-foreground">
            No material consumed at this stage yet.
          </Text>
        )}
      </View>
    </View>
  );
}
