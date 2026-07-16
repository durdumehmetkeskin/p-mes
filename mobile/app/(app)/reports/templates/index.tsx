import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { RECIPE_LABEL } from "@/components/report/report-constants";

interface ReportDef extends BaseRecord {
  id: string;
  name?: string;
  dataSource?: string;
  recipe?: string;
  isActive?: boolean;
  isSystem?: boolean;
}

export default function ReportTemplatesListScreen() {
  const router = useRouter();
  return (
    <ListScreen<ReportDef>
      resource="report-definitions"
      title="Report Templates"
      createRoute="/reports/templates/create"
      emptyTitle="No templates"
      renderItem={(r) => (
        <Pressable
          onPress={() => router.push(`/reports/templates/${r.id}/edit`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-foreground">
                {r.name}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {r.dataSource} · {RECIPE_LABEL[r.recipe ?? ""] ?? r.recipe}
              </Text>
            </View>
            <View className="items-end gap-1">
              <StatusBadge label={r.isActive === false ? "inactive" : "active"} />
              <Badge variant={r.isSystem ? "default" : "secondary"}>
                {r.isSystem ? "system" : "custom"}
              </Badge>
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}
