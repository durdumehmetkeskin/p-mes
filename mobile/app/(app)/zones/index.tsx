import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { labelWarehouse } from "@/lib/labels";

interface Zone extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  isActive?: boolean;
  warehouse?: BaseRecord;
}

export default function ZonesListScreen() {
  const router = useRouter();
  return (
    <ListScreen<Zone>
      resource="zones"
      title="Zones"
      search
      createRoute="/zones/create"
      tabBar
      emptyTitle="No zones"
      renderItem={(z) => (
        <Pressable
          onPress={() => router.push(`/zones/${z.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-foreground">
                {z.name || z.code}
              </Text>
              <Text className="font-mono text-xs text-muted-foreground">
                {z.code}
              </Text>
            </View>
            <StatusBadge label={z.isActive === false ? "inactive" : "active"} />
          </View>
          {z.warehouse ? (
            <Text className="mt-1 text-xs text-muted-foreground">
              {labelWarehouse(z.warehouse)}
            </Text>
          ) : null}
        </Pressable>
      )}
    />
  );
}
