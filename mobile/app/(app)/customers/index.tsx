import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";

interface Customer extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  email?: string;
  isActive?: boolean;
}

export default function CustomersListScreen() {
  const router = useRouter();
  return (
    <ListScreen<Customer>
      resource="customers"
      title="Customers"
      search
      createRoute="/customers/create"
      tabBar
      emptyTitle="No customers"
      renderItem={(c) => (
        <Pressable
          onPress={() => router.push(`/customers/${c.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-foreground">
                {c.name}
              </Text>
              <Text className="font-mono text-xs text-muted-foreground">
                {c.code}
              </Text>
            </View>
            <StatusBadge label={c.isActive === false ? "inactive" : "active"} />
          </View>
          {c.email ? (
            <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
              {c.email}
            </Text>
          ) : null}
        </Pressable>
      )}
    />
  );
}
