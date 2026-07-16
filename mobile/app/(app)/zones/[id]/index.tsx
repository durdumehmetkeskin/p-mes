import { Pressable, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useOne } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ChildList } from "@/components/refine-ui/child-list";
import { DetailActions } from "@/components/refine-ui/detail-actions";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { labelWarehouse } from "@/lib/labels";

interface Zone extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  warehouse?: BaseRecord;
  project?: { code?: string; name?: string } | null;
}

interface Rack extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  isActive?: boolean;
}

export default function ZoneDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { query, result } = useOne<Zone>({ resource: "zones", id });
  const z = result;

  return (
    <Screen
      title={z?.name || z?.code || "Zone"}
      subtitle={z?.warehouse ? labelWarehouse(z.warehouse) : undefined}
      canGoBack
      headerRight={
        <DetailActions
          resource="zones"
          id={id as string}
          name={z?.name ?? z?.code ?? "this zone"}
          editRoute={`/zones/${id}/edit`}
        />
      }
    >
      {query.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-32 w-full" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Details</SectionLabel>
              <StatusBadge label={z?.isActive === false ? "inactive" : "active"} />
            </View>
            <FieldRow label="Code" value={z?.code} mono />
            <FieldRow
              label="Warehouse"
              value={z?.warehouse ? labelWarehouse(z.warehouse) : undefined}
            />
            <FieldRow
              label="Project"
              value={
                z?.project
                  ? [z.project.code, z.project.name].filter(Boolean).join(" · ")
                  : undefined
              }
            />
            {z?.description ? (
              <FieldRow label="Description" value={z.description} />
            ) : null}
          </View>

          <ChildList<Rack>
            resource="racks"
            title="Racks"
            filters={[{ field: "zoneId", operator: "eq", value: id }]}
            emptyText="No racks"
            renderItem={(r) => (
              <Pressable
                className="flex-row items-center justify-between p-3 active:bg-accent"
                onPress={() => router.push(`/racks/${r.id}`)}
              >
                <View>
                  <Text className="text-sm text-foreground">{r.name || r.code}</Text>
                  <Text className="font-mono text-xs text-muted-foreground">
                    {r.code}
                  </Text>
                </View>
                <StatusBadge label={r.isActive === false ? "inactive" : "active"} />
              </Pressable>
            )}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
