import { Pressable, Text, View } from "react-native";
import {
  type BaseRecord,
  useDelete,
  useInvalidate,
  useList,
} from "@refinedev/core";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";

import { Can } from "@/components/can";
import { QrCodeButton } from "@/components/qr/qr-code-button";
import { confirmDelete } from "@/components/refine-ui/confirm";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Icon } from "@/components/ui/icon";
import { colors } from "@/lib/theme";

interface OrderItem extends BaseRecord {
  id: string;
  sequence?: number;
  name?: string;
  status?: string;
}

/** Order → Items list. Each item opens its own screen with the processes. */
export function OrderItemsList({
  projectId,
  orderId,
  orderNumber,
}: {
  projectId: string;
  orderId: string;
  /** For the per-item QR label (`<orderNumber>-<sequence>`). */
  orderNumber?: string;
}) {
  const router = useRouter();
  const invalidate = useInvalidate();
  const { mutate: remove } = useDelete();
  const { result } = useList<OrderItem>({
    resource: "order-items",
    filters: [{ field: "orderId", operator: "eq", value: orderId }],
    sorters: [{ field: "sequence", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const items = result?.data ?? [];
  const nextSeq = items.reduce((m, i) => Math.max(m, i.sequence ?? 0), 0) + 1;
  const refresh = () =>
    invalidate({ resource: "order-items", invalidates: ["list"] });

  return (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <View className="flex-row items-center justify-between border-b border-border p-3">
        <Text className="font-sans-semibold text-sm text-card-foreground">
          Items{items.length ? ` (${items.length})` : ""}
        </Text>
        <Can resource="order-items" action="create">
          <Pressable
            onPress={() =>
              router.push(
                `/projects/${projectId}/order-item-new?orderId=${orderId}&sequence=${nextSeq}`,
              )
            }
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
          >
            <Icon icon={Plus} size={18} color={colors.foreground} />
          </Pressable>
        </Can>
      </View>
      {items.length === 0 ? (
        <Text className="p-3 text-sm text-muted-foreground">
          No items yet. Add an item to plan its processes.
        </Text>
      ) : (
        items.map((it, i) => (
          <View
            key={it.id}
            className={i > 0 ? "flex-row items-center gap-1 border-t border-border p-3" : "flex-row items-center gap-1 p-3"}
          >
            <Pressable
              className="flex-1 flex-row items-center gap-2"
              onPress={() =>
                router.push(
                  `/projects/${projectId}/order-item/${it.id}?orderId=${orderId}`,
                )
              }
            >
              <Text className="flex-1 text-sm text-foreground">
                #{it.sequence} · {it.name}
              </Text>
              {it.status ? <StatusBadge label={it.status} /> : null}
              <Icon icon={ChevronRight} size={16} color={colors.mutedForeground} />
            </Pressable>
            <QrCodeButton
              resource="order-items"
              id={it.id}
              code={
                orderNumber
                  ? `${orderNumber}-${it.sequence}`
                  : `#${it.sequence}`
              }
            />
            <Can resource="order-items" action="edit">
              <Pressable
                onPress={() =>
                  router.push(
                    `/projects/${projectId}/order-item-new?editId=${it.id}&orderId=${orderId}`,
                  )
                }
                hitSlop={6}
                className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
              >
                <Icon icon={Pencil} size={15} color={colors.mutedForeground} />
              </Pressable>
            </Can>
            <Can resource="order-items" action="delete">
              <Pressable
                onPress={() =>
                  confirmDelete(it.name ?? "item", () =>
                    remove(
                      { resource: "order-items", id: it.id },
                      { onSuccess: refresh },
                    ),
                  )
                }
                hitSlop={6}
                className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
              >
                <Icon icon={Trash2} size={15} color={colors.destructive} />
              </Pressable>
            </Can>
          </View>
        ))
      )}
    </View>
  );
}
