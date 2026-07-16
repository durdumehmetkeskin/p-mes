import { Pressable, ScrollView, View } from "react-native";
import { type BaseRecord, useOne } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { DetailActions } from "@/components/refine-ui/detail-actions";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Contact extends BaseRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  customerId?: string;
  customer?: { id?: string; code?: string; name?: string };
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { query, result } = useOne<Contact>({ resource: "contacts", id });
  const c = result;
  const fullName = [c?.firstName, c?.lastName].filter(Boolean).join(" ");

  return (
    <Screen
      title={fullName || "Contact"}
      subtitle={c?.role ?? undefined}
      canGoBack
      headerRight={
        <DetailActions
          resource="contacts"
          id={id as string}
          name={fullName || "this contact"}
          editRoute={`/contacts/${id}/edit`}
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
            <Pressable
              onPress={() =>
                c?.customer?.id && router.push(`/customers/${c.customer.id}`)
              }
            >
              <FieldRow
                label="Customer"
                value={
                  c?.customer
                    ? [c.customer.code, c.customer.name].filter(Boolean).join(" · ")
                    : undefined
                }
              />
            </Pressable>
            <FieldRow label="Role" value={c?.role} />
            <FieldRow label="Email" value={c?.email} />
            <FieldRow label="Phone" value={c?.phone} />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
