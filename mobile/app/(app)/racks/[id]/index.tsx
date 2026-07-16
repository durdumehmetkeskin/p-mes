import { ScrollView, Text, View } from "react-native";
import { type BaseRecord, useOne } from "@refinedev/core";
import { useLocalSearchParams } from "expo-router";

import { ChildList } from "@/components/refine-ui/child-list";
import { DetailActions } from "@/components/refine-ui/detail-actions";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { labelMaterial, labelRack } from "@/lib/labels";

interface Rack extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  zone?: BaseRecord;
  order?: { orderNumber?: string } | null;
}

interface Balance extends BaseRecord {
  id: string;
  material?: BaseRecord;
  currentStock?: string | number;
  availableStock?: string | number;
}

interface Tool extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  status?: string;
}

export default function RackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { query, result } = useOne<Rack>({ resource: "racks", id });
  const r = result;

  return (
    <Screen
      title={r?.name || r?.code || "Rack"}
      subtitle={r ? labelRack(r) : undefined}
      canGoBack
      headerRight={
        <DetailActions
          resource="racks"
          id={id as string}
          name={r?.name ?? r?.code ?? "this rack"}
          editRoute={`/racks/${id}/edit`}
        />
      }
    >
      {query.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-28 w-full" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Details</SectionLabel>
              <StatusBadge label={r?.isActive === false ? "inactive" : "active"} />
            </View>
            <FieldRow label="Code" value={r?.code} mono />
            <FieldRow label="Location" value={r ? labelRack(r) : undefined} />
            <FieldRow label="Dedicated order" value={r?.order?.orderNumber} />
            {r?.description ? (
              <FieldRow label="Description" value={r.description} />
            ) : null}
          </View>

          <ChildList<Balance>
            resource="inventory-balances"
            title="Materials in rack"
            filters={[{ field: "rackId", operator: "eq", value: id }]}
            emptyText="No stock in this rack"
            renderItem={(b) => (
              <View className="flex-row items-center justify-between p-3">
                <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
                  {b.material ? labelMaterial(b.material) : "—"}
                </Text>
                <Text className="font-mono text-sm text-foreground">
                  {b.availableStock ?? b.currentStock ?? "0"}
                </Text>
              </View>
            )}
          />

          <ChildList<Tool>
            resource="tools"
            title="Tools in rack"
            filters={[{ field: "rackId", operator: "eq", value: id }]}
            emptyText="No tools in this rack"
            renderItem={(t) => (
              <View className="flex-row items-center justify-between p-3">
                <View className="flex-1">
                  <Text className="text-sm text-foreground">{t.name}</Text>
                  <Text className="font-mono text-xs text-muted-foreground">
                    {t.code}
                  </Text>
                </View>
                {t.status ? <StatusBadge label={t.status} /> : null}
              </View>
            )}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
