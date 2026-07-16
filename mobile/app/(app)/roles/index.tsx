import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { Badge } from "@/components/ui/badge";

interface Role extends BaseRecord {
  id: string;
  name?: string;
  description?: string;
  isSystem?: boolean;
}

export default function RolesListScreen() {
  const router = useRouter();
  return (
    <ListScreen<Role>
      resource="roles"
      title="Roles"
      createRoute="/roles/create"
      tabBar
      emptyTitle="No roles"
      renderItem={(r) => (
        <Pressable
          onPress={() => router.push(`/roles/${r.id}/edit`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-foreground">
                {r.name}
              </Text>
              {r.description ? (
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {r.description}
                </Text>
              ) : null}
            </View>
            <Badge variant={r.isSystem ? "default" : "secondary"}>
              {r.isSystem ? "system" : "custom"}
            </Badge>
          </View>
        </Pressable>
      )}
    />
  );
}
