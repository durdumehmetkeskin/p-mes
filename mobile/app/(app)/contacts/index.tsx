import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";

interface Contact extends BaseRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  email?: string;
  isActive?: boolean;
  customer?: { code?: string; name?: string };
}

export default function ContactsListScreen() {
  const router = useRouter();
  return (
    <ListScreen<Contact>
      resource="contacts"
      title="Contacts"
      createRoute="/contacts/create"
      tabBar
      emptyTitle="No contacts"
      renderItem={(c) => (
        <Pressable
          onPress={() => router.push(`/contacts/${c.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-foreground">
                {[c.firstName, c.lastName].filter(Boolean).join(" ")}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {c.customer?.name ?? "—"}
                {c.role ? ` · ${c.role}` : ""}
              </Text>
            </View>
            <StatusBadge label={c.isActive === false ? "inactive" : "active"} />
          </View>
        </Pressable>
      )}
    />
  );
}
