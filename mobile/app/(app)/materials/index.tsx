import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { StockActionsButton } from "@/components/stock/stock-actions-button";

interface Material extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  isActive?: boolean;
  materialType?: { name?: string };
  materialUnit?: { name?: string } | null;
}

export default function MaterialsListScreen() {
  const router = useRouter();

  return (
    <ListScreen<Material>
      resource="materials"
      title="Materials"
      search
      searchPlaceholder="Search materials…"
      createRoute="/materials/create"
      headerRight={<StockActionsButton />}
      tabBar
      emptyTitle="No materials"
      emptyMessage="Create your first material to get started."
      renderItem={(m) => (
        <Pressable
          onPress={() => router.push(`/materials/${m.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
                {m.name}
              </Text>
              <Text className="font-mono text-xs text-muted-foreground">
                {m.code}
              </Text>
            </View>
            <StatusBadge label={m.isActive === false ? "inactive" : "active"} />
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">
              {m.materialType?.name ?? "—"}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {m.materialUnit?.name ?? ""}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}
