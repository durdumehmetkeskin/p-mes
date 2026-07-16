import { ScrollView, View } from "react-native";
import { type BaseRecord, useOne } from "@refinedev/core";
import { format } from "date-fns";
import { useLocalSearchParams } from "expo-router";

import { DetailActions } from "@/components/refine-ui/detail-actions";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface User extends BaseRecord {
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

function shortDate(v?: string) {
  if (!v) return undefined;
  try {
    return format(new Date(v), "dd MMM yyyy HH:mm");
  } catch {
    return v;
  }
}

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { query, result } = useOne<User>({ resource: "users", id });
  const u = result;

  return (
    <Screen
      title={u?.name ?? "User"}
      subtitle={u?.email}
      canGoBack
      headerRight={
        <DetailActions
          resource="users"
          id={id as string}
          name={u?.name ?? "this user"}
          editRoute={`/users/${id}/edit`}
        />
      }
    >
      {query.isLoading ? (
        <View className="p-4">
          <Skeleton className="h-40 w-full" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <SectionLabel>Account</SectionLabel>
            <FieldRow label="Email" value={u?.email} />
            <FieldRow label="Name" value={u?.name} />
            <View className="flex-row items-center justify-between py-2">
              <SectionLabel>Roles</SectionLabel>
              <View className="flex-row flex-wrap justify-end gap-1">
                {u?.roles?.length
                  ? u.roles.map((r: string) => (
                      <Badge key={r} variant="secondary">
                        {r}
                      </Badge>
                    ))
                  : null}
              </View>
            </View>
            <FieldRow label="Created" value={shortDate(u?.createdAt)} />
            <FieldRow label="Updated" value={shortDate(u?.updatedAt)} />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
