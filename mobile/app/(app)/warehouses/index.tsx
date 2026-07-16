import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";

interface Warehouse extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  address?: string;
  isActive?: boolean;
}

export default function WarehousesListScreen() {
  const router = useRouter();
  return (
    <ListScreen<Warehouse>
      resource="warehouses"
      title="Warehouses"
      search
      createRoute="/warehouses/create"
      tabBar
      emptyTitle="No warehouses"
      renderItem={(w) => (
        <Pressable
          onPress={() => router.push(`/warehouses/${w.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-foreground">
                {w.name}
              </Text>
              <Text className="font-mono text-xs text-muted-foreground">
                {w.code}
              </Text>
            </View>
            <StatusBadge label={w.isActive === false ? "inactive" : "active"} />
          </View>
          {w.address ? (
            <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
              {w.address}
            </Text>
          ) : null}
        </Pressable>
      )}
    />
  );
}
