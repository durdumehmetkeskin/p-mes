import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { BaseRecord, CrudFilter } from "@refinedev/core";
import { useRouter } from "expo-router";

import { KpiCard } from "@/components/refine-ui/kpi-card";
import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { TOOL_CATEGORIES, toolCategoryLabel } from "@/components/tool/tool-constants";
import { useCount } from "@/hooks/use-count";
import { cn } from "@/lib/utils";
import { labelRack } from "@/lib/labels";

interface Tool extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  category?: string;
  status?: string;
  quantity?: string | number;
  currentLifeCycle?: string | number;
  maxLifeCycle?: string | number;
  rack?: BaseRecord;
}

function ToolsHeader({
  category,
  onSelect,
}: {
  category: string | null;
  onSelect: (c: string | null) => void;
}) {
  const total = useCount("tools");
  const inUse = useCount("tools", [
    { field: "status", operator: "eq", value: "in_use" },
  ]);
  const maint = useCount("tools", [
    { field: "status", operator: "eq", value: "maintenance" },
  ]);
  const retired = useCount("tools", [
    { field: "status", operator: "eq", value: "retired" },
  ]);

  const chips: { label: string; value: string | null }[] = [
    { label: "All", value: null },
    ...TOOL_CATEGORIES.map((c) => ({ label: c.label.split(" (")[0], value: c.value })),
  ];

  return (
    <View className="gap-3 pb-3">
      <View className="flex-row flex-wrap justify-between gap-y-3">
        <View className="w-[48%]">
          <KpiCard label="Total" value={total ?? "—"} tone="primary" mono />
        </View>
        <View className="w-[48%]">
          <KpiCard label="In use" value={inUse ?? "—"} tone="info" mono />
        </View>
        <View className="w-[48%]">
          <KpiCard label="Maintenance" value={maint ?? "—"} tone="warning" mono />
        </View>
        <View className="w-[48%]">
          <KpiCard label="Retired" value={retired ?? "—"} tone="danger" mono />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {chips.map((chip) => {
            const active = category === chip.value;
            return (
              <Pressable
                key={chip.label}
                onPress={() => onSelect(chip.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5",
                  active
                    ? "border-primary bg-primary/15"
                    : "border-border bg-card",
                )}
              >
                <Text
                  className={cn(
                    "text-xs",
                    active ? "font-sans-medium text-primary" : "text-muted-foreground",
                  )}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default function ToolsListScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);

  const filters: CrudFilter[] = category
    ? [{ field: "category", operator: "eq", value: category }]
    : [];

  return (
    <ListScreen<Tool>
      resource="tools"
      title="Tools"
      search
      createRoute="/tools/create"
      tabBar
      filters={filters}
      emptyTitle="No tools"
      ListHeader={<ToolsHeader category={category} onSelect={setCategory} />}
      renderItem={(t) => (
        <Pressable
          onPress={() => router.push(`/tools/${t.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-foreground">
                {t.name}
              </Text>
              <Text className="font-mono text-xs text-muted-foreground">
                {t.code}
              </Text>
            </View>
            {t.status ? <StatusBadge label={t.status} /> : null}
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">
              {toolCategoryLabel(t.category).split(" (")[0]}
            </Text>
            <Text className="font-mono text-xs text-muted-foreground">
              {t.maxLifeCycle
                ? `${t.currentLifeCycle ?? 0} / ${t.maxLifeCycle} cyc`
                : t.rack
                  ? labelRack(t.rack)
                  : ""}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}
