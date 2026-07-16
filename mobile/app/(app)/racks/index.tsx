import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { labelRack } from "@/lib/labels";

interface Rack extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  isActive?: boolean;
  zone?: BaseRecord;
}

export default function RacksListScreen() {
  const router = useRouter();
  return (
    <ListScreen<Rack>
      resource="racks"
      title="Racks"
      search
      createRoute="/racks/create"
      tabBar
      emptyTitle="No racks"
      renderItem={(r) => (
        <Pressable
          onPress={() => router.push(`/racks/${r.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-foreground">
                {r.name || r.code}
              </Text>
              <Text className="font-mono text-xs text-muted-foreground">
                {labelRack(r) || r.code}
              </Text>
            </View>
            <StatusBadge label={r.isActive === false ? "inactive" : "active"} />
          </View>
        </Pressable>
      )}
    />
  );
}
