import { Pressable, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useOne } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ChildList } from "@/components/refine-ui/child-list";
import { DetailActions } from "@/components/refine-ui/detail-actions";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Warehouse extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  address?: string;
  description?: string;
  isActive?: boolean;
}

interface Zone extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  isActive?: boolean;
}

export default function WarehouseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { query, result } = useOne<Warehouse>({ resource: "warehouses", id });
  const w = result;

  return (
    <Screen
      title={w?.name ?? "Warehouse"}
      subtitle={w?.code}
      canGoBack
      headerRight={
        <DetailActions
          resource="warehouses"
          id={id as string}
          name={w?.name ?? "this warehouse"}
          editRoute={`/warehouses/${id}/edit`}
        />
      }
    >
      {query.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-40 w-full" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Details</SectionLabel>
              <StatusBadge label={w?.isActive === false ? "inactive" : "active"} />
            </View>
            <FieldRow label="Code" value={w?.code} mono />
            <FieldRow label="Address" value={w?.address} />
            <FieldRow label="Responsible" value={w?.responsibleUser?.name} />
            {w?.description ? (
              <FieldRow label="Description" value={w.description} />
            ) : null}
          </View>

          <ChildList<Zone>
            resource="zones"
            title="Zones"
            filters={[{ field: "warehouseId", operator: "eq", value: id }]}
            emptyText="No zones"
            renderItem={(z) => (
              <Pressable
                className="flex-row items-center justify-between p-3 active:bg-accent"
                onPress={() => router.push(`/zones/${z.id}`)}
              >
                <View>
                  <Text className="text-sm text-foreground">{z.name}</Text>
                  <Text className="font-mono text-xs text-muted-foreground">
                    {z.code}
                  </Text>
                </View>
                <StatusBadge label={z.isActive === false ? "inactive" : "active"} />
              </Pressable>
            )}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
