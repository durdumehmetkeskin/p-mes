import { Pressable, ScrollView, View } from "react-native";
import {
  type BaseRecord,
  useDelete,
  useList,
  useOne,
} from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";

import { confirmDelete } from "@/components/refine-ui/confirm";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { humanizeStatus } from "@/components/project/detail-config";
import { useCanEditProject } from "@/hooks/use-can-edit-project";
import { OrderItemsList } from "@/components/order/order-items-list";
import { OrderRequirementsList } from "@/components/order/order-requirements-list";
import { colors } from "@/lib/theme";

interface Order extends BaseRecord {
  id: string;
  orderNumber?: string;
  name?: string;
  dueDate?: string;
  status?: string;
  description?: string;
}

export default function OrderDetailScreen() {
  const { id, orderId } = useLocalSearchParams<{ id: string; orderId: string }>();
  const router = useRouter();
  const { query, result } = useOne<Order>({ resource: "orders", id: orderId });
  const o = result;

  // Deleting an order is reserved to admins and the project's manager
  // (backend mirrors with a 403).
  const { result: project } = useOne<{ managerUserId?: string | null }>({
    resource: "projects",
    id: id as string,
    queryOptions: { enabled: Boolean(id) },
  });
  const canEditProject = useCanEditProject();
  const canManageOrders = canEditProject(project?.managerUserId);

  // Leaf-first: an order can only be deleted once it has no processes.
  const { result: processList } = useList<BaseRecord>({
    resource: "processes",
    filters: [{ field: "orderId", operator: "eq", value: orderId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!orderId, retry: false },
    errorNotification: false,
  });
  const hasProcesses = (processList?.data?.length ?? 0) > 0;

  const { mutate: removeOrder } = useDelete();
  const onDeleteOrder = () =>
    confirmDelete("order", () =>
      removeOrder(
        { resource: "orders", id: orderId as string },
        { onSuccess: () => router.back() },
      ),
    );

  return (
    <Screen
      title={o?.orderNumber ?? "Order"}
      subtitle={o?.name}
      canGoBack
      headerRight={
        <View className="flex-row items-center gap-1">
          {!hasProcesses && canManageOrders ? (
            <Pressable
              onPress={onDeleteOrder}
              hitSlop={6}
              className="h-9 w-9 items-center justify-center rounded-md active:bg-accent"
            >
              <Icon icon={Trash2} size={18} color={colors.destructive} />
            </Pressable>
          ) : null}
        </View>
      }
    >
      {query.isLoading ? (
        <View className="p-4">
          <Skeleton className="h-32 w-full" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <SectionLabel>Order</SectionLabel>
            <FieldRow label="Number" value={o?.orderNumber} mono />
            <FieldRow label="Due date" value={o?.dueDate} />
            <FieldRow label="Status" value={humanizeStatus(o?.status)} />
            {o?.description ? (
              <FieldRow label="Description" value={o.description} />
            ) : null}
          </View>

          <OrderItemsList
            projectId={id as string}
            orderId={orderId as string}
            orderNumber={o?.orderNumber}
          />

          <OrderRequirementsList
            projectId={id as string}
            orderId={orderId as string}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
