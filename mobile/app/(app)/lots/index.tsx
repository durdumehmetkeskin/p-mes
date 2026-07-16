import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { labelMaterial } from "@/lib/labels";

interface Lot extends BaseRecord {
  id: string;
  lotNumber?: string;
  status?: string;
  expiryDate?: string;
  material?: BaseRecord;
  rack?: BaseRecord;
}

export default function LotsListScreen() {
  const router = useRouter();
  return (
    <ListScreen<Lot>
      resource="lots"
      title="Lots"
      search
      createRoute="/lots/create"
      tabBar
      emptyTitle="No lots"
      renderItem={(l) => (
        <Pressable
          onPress={() => router.push(`/lots/${l.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-mono text-sm text-foreground">
                {l.lotNumber}
              </Text>
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {l.material ? labelMaterial(l.material) : "—"}
              </Text>
            </View>
            {l.status ? <StatusBadge label={l.status} /> : null}
          </View>
          <View className="mt-2">
            <Text className="text-xs text-muted-foreground">
              {l.expiryDate ? `Exp ${l.expiryDate}` : "No expiry"}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}
