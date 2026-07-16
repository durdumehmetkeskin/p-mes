import { ScrollView, View } from "react-native";
import { type BaseRecord, useOne } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { DetailActions } from "@/components/refine-ui/detail-actions";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { humanizeStatus } from "@/components/project/detail-config";
import { OrderProcesses } from "@/components/project/process-engine";

interface OrderItem extends BaseRecord {
  id: string;
  sequence?: number;
  name?: string;
  status?: string;
  description?: string;
}

export default function OrderItemDetailScreen() {
  const { id, itemId, orderId } = useLocalSearchParams<{
    id: string;
    itemId: string;
    orderId: string;
  }>();
  const router = useRouter();
  const { query, result } = useOne<OrderItem>({
    resource: "order-items",
    id: itemId,
  });
  const item = result;

  return (
    <Screen
      title={item ? `#${item.sequence} · ${item.name}` : "Item"}
      canGoBack
      headerRight={
        <DetailActions
          resource="order-items"
          id={itemId as string}
          name={item?.name ?? "this item"}
          editRoute={`/projects/${id}/order-item-new?editId=${itemId}&orderId=${orderId}`}
        />
      }
    >
      {query.isLoading ? (
        <View className="p-4">
          <Skeleton className="h-32 w-full" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <SectionLabel>Item</SectionLabel>
            <FieldRow label="Line #" value={item?.sequence} mono />
            <FieldRow label="Name" value={item?.name} />
            <FieldRow label="Status" value={humanizeStatus(item?.status)} />
            {item?.description ? (
              <FieldRow label="Description" value={item.description} />
            ) : null}
          </View>

          <OrderProcesses
            projectId={id as string}
            orderItemId={itemId as string}
            orderId={orderId as string}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
