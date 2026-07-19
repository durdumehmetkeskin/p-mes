import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import {
  type BaseRecord,
  useDelete,
  useInvalidate,
  useList,
  useOne,
} from "@refinedev/core";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageCheck,
  PackagePlus,
  Plus,
  Trash2,
  Truck,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import { confirmDelete } from "@/components/refine-ui/confirm";
import { Icon } from "@/components/ui/icon";
import { axiosInstance } from "@/providers/axios";
import { useCanEditProject } from "@/hooks/use-can-edit-project";
import { colors } from "@/lib/theme";

/** Reservation state of a requirement row, derived from the server totals. */
function requirementState(r: BaseRecord) {
  const required = Number(r.requiredQuantity ?? 0);
  const reserved = Number(r.reservedQuantity ?? 0);
  const reserving = Number(r.reservingQuantity ?? 0);
  const delivering = Number(r.deliveringQuantity ?? 0);
  const delivered = Number(r.deliveredQuantity ?? 0);
  const available = Number(r.availableQuantity ?? 0);
  const covered = reserved + reserving;
  const remaining = Math.max(0, Math.round((required - covered) * 1000) / 1000);
  return {
    required,
    reserved,
    reserving,
    delivering,
    delivered,
    available,
    remaining,
    fullyReserved: required > 0 && reserved >= required,
    pending: reserving > 0,
    shortage: remaining > 0 && available < remaining,
  };
}

// Handover progress mirrors the warehouse flow:
// reserving → reserved → delivering → delivered.
function StatusIcon({ r }: { r: BaseRecord }) {
  const s = requirementState(r);
  if (s.required <= 0) return null;
  if (s.delivered >= s.required) {
    return <Icon icon={PackageCheck} size={16} color={colors.success} />;
  }
  if (s.shortage) {
    return <Icon icon={AlertTriangle} size={16} color={colors.destructive} />;
  }
  if (s.delivering > 0) {
    return <Icon icon={Truck} size={16} color={colors.info} />;
  }
  if (s.pending) {
    return <Icon icon={Clock} size={16} color={colors.warning} />;
  }
  if (s.fullyReserved) {
    return <Icon icon={CheckCircle2} size={16} color={colors.success} />;
  }
  return null;
}

/** Order → required materials (per-order needed quantity + reserve action). */
export function OrderRequirementsList({
  projectId,
  orderId,
}: {
  projectId: string;
  orderId: string;
}) {
  // Editing the requirements list is reserved to admins and the project's
  // manager (backend mirrors with a 403); members are read-only.
  const { result: reqProject } = useOne<{ managerUserId?: string | null }>({
    resource: "projects",
    id: projectId,
    queryOptions: { enabled: Boolean(projectId) },
  });
  const canEditProject = useCanEditProject();
  const canManage = canEditProject(reqProject?.managerUserId);
  const router = useRouter();
  const invalidate = useInvalidate();
  const { mutate: remove } = useDelete();
  const [reservingId, setReservingId] = useState<string | null>(null);
  const { result } = useList<BaseRecord>({
    resource: "order-material-requirements",
    filters: [{ field: "orderId", operator: "eq", value: orderId }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const rows = result?.data ?? [];
  const refresh = () => {
    invalidate({
      resource: "order-material-requirements",
      invalidates: ["list"],
    });
    invalidate({ resource: "stock-items", invalidates: ["list"] });
  };

  // Reserve what the requirement still needs, capped at the available stock
  // (partial reservation is allowed when stock runs short).
  const onReserve = async (r: BaseRecord) => {
    const s = requirementState(r);
    const quantity = Math.min(s.remaining, s.available);
    if (quantity <= 0) return;
    setReservingId(r.id as string);
    try {
      await axiosInstance.post(`/order-material-requirements/${r.id}/reserve`, {
        quantity,
      });
      if (s.shortage) {
        Alert.alert(
          "Partially reserved",
          `Reserved ${quantity} — stock is short of the remaining need.`,
        );
      }
      refresh();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Reservation failed";
      Alert.alert("Reserve", msg);
    } finally {
      setReservingId(null);
    }
  };

  return (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <View className="flex-row items-center justify-between border-b border-border p-3">
        <Text className="font-sans-semibold text-sm text-card-foreground">
          Required materials{rows.length ? ` (${rows.length})` : ""}
        </Text>
        {canManage && (
          <Pressable
            onPress={() =>
              router.push(
                `/projects/${projectId}/required-material-new?orderId=${orderId}`,
              )
            }
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
          >
            <Icon icon={Plus} size={18} color={colors.foreground} />
          </Pressable>
        )}
      </View>
      {rows.length === 0 ? (
        <Text className="p-3 text-sm text-muted-foreground">
          No required materials
        </Text>
      ) : (
        rows.map((r, i) => {
          const s = requirementState(r);
          const unit = r.material?.materialUnit?.name ?? "";
          const canReserve = s.remaining > 0 && s.available > 0;
          return (
            <View
              key={r.id}
              className={i > 0 ? "gap-2 border-t border-border p-3" : "gap-2 p-3"}
            >
              <View className="flex-row items-center justify-between">
                <Pressable
                  className="flex-1"
                  disabled={!canManage}
                  onPress={() =>
                    router.push(
                      `/projects/${projectId}/required-material-new?editId=${r.id}&orderId=${orderId}`,
                    )
                  }
                >
                  <Text className="text-sm text-foreground">
                    {r.material?.name ?? "—"}
                  </Text>
                  <Text className="font-mono text-xs text-muted-foreground">
                    {r.material?.code ?? ""}
                  </Text>
                </Pressable>
                <View className="mr-2 items-end">
                  <Text className="font-mono text-sm text-foreground">
                    {s.reserved}
                    {s.reserving > 0 ? ` (+${s.reserving})` : ""} / {s.required}{" "}
                    {unit}
                  </Text>
                  <Text className="font-mono text-xs text-muted-foreground">
                    stock {s.available} {unit}
                  </Text>
                </View>
                <StatusIcon r={r} />
                {canManage && (
                  <Pressable
                    onPress={() =>
                      confirmDelete(
                        (r.material?.name as string) ?? "material",
                        () =>
                          remove(
                            {
                              resource: "order-material-requirements",
                              id: r.id as string,
                            },
                            { onSuccess: refresh },
                          ),
                      )
                    }
                    hitSlop={6}
                    className="ml-1 h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                  >
                    <Icon icon={Trash2} size={15} color={colors.destructive} />
                  </Pressable>
                )}
              </View>
              {s.shortage ? (
                <Text className="text-xs" style={{ color: colors.destructive }}>
                  Insufficient stock — {s.remaining} {unit} needed, only{" "}
                  {s.available} {unit} available
                </Text>
              ) : null}
              {canReserve ? (
                <Pressable
                  onPress={() => void onReserve(r)}
                  disabled={reservingId === r.id}
                  className="flex-row items-center justify-center gap-1 self-start rounded-md border px-3 py-1.5 active:bg-accent"
                  style={{
                    borderColor: s.shortage
                      ? colors.destructive
                      : colors.border,
                  }}
                >
                  <Icon
                    icon={PackagePlus}
                    size={14}
                    color={s.shortage ? colors.destructive : colors.foreground}
                  />
                  <Text
                    className="text-xs"
                    style={{
                      color: s.shortage
                        ? colors.destructive
                        : colors.foreground,
                    }}
                  >
                    {reservingId === r.id
                      ? "Reserving..."
                      : s.shortage
                        ? `Reserve ${Math.min(s.remaining, s.available)} ${unit}`
                        : "Reserve"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}
