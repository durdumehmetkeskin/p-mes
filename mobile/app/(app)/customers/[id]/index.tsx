import { Pressable, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useOne } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ChildList } from "@/components/refine-ui/child-list";
import { DetailActions } from "@/components/refine-ui/detail-actions";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Customer extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

interface Contact extends BaseRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  email?: string;
  isActive?: boolean;
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { query, result } = useOne<Customer>({ resource: "customers", id });
  const c = result;

  return (
    <Screen
      title={c?.name ?? "Customer"}
      subtitle={c?.code}
      canGoBack
      headerRight={
        <DetailActions
          resource="customers"
          id={id as string}
          name={c?.name ?? "this customer"}
          editRoute={`/customers/${id}/edit`}
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
              <StatusBadge label={c?.isActive === false ? "inactive" : "active"} />
            </View>
            <FieldRow label="Code" value={c?.code} mono />
            <FieldRow label="Tax number" value={c?.taxNumber} />
            <FieldRow label="Email" value={c?.email} />
            <FieldRow label="Phone" value={c?.phone} />
            <FieldRow label="Address" value={c?.address} />
          </View>

          <ChildList<Contact>
            resource="contacts"
            title="Contacts"
            filters={[{ field: "customerId", operator: "eq", value: id }]}
            emptyText="No contacts"
            renderItem={(ct) => (
              <Pressable
                className="flex-row items-center justify-between p-3 active:bg-accent"
                onPress={() => router.push(`/contacts/${ct.id}`)}
              >
                <View className="flex-1">
                  <Text className="text-sm text-foreground">
                    {[ct.firstName, ct.lastName].filter(Boolean).join(" ")}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {[ct.role, ct.email].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <StatusBadge label={ct.isActive === false ? "inactive" : "active"} />
              </Pressable>
            )}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
