import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";

interface Location extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  isActive?: boolean;
}

export default function LocationsListScreen() {
  const router = useRouter();
  return (
    <ListScreen<Location>
      resource="locations"
      title="Locations"
      search
      createRoute="/locations/create"
      tabBar
      emptyTitle="No locations"
      renderItem={(l) => (
        <Pressable
          onPress={() => router.push(`/locations/${l.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-foreground">
                {l.name}
              </Text>
              <Text className="font-mono text-xs text-muted-foreground">
                {l.code}
              </Text>
            </View>
            <StatusBadge label={l.isActive === false ? "inactive" : "active"} />
          </View>
        </Pressable>
      )}
    />
  );
}
