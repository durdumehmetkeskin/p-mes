import { ScrollView, Text, View } from "react-native";
import { type BaseRecord, useList } from "@refinedev/core";
import { formatDistanceToNow } from "date-fns";
import { Factory, FolderKanban, Package, Wrench } from "lucide-react-native";
import { useRouter } from "expo-router";

import { Can } from "@/components/can";
import { KpiCard, type KpiTone } from "@/components/refine-ui/kpi-card";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import type { LucideIcon } from "lucide-react-native";

function useCount(resource: string): number | undefined {
  const { result } = useList({
    resource,
    pagination: { pageSize: 1 },
    errorNotification: false,
    queryOptions: { retry: false },
  });
  return result.total;
}

function Kpi({
  label,
  resource,
  icon,
  tone,
  to,
}: {
  label: string;
  resource: string;
  icon: LucideIcon;
  tone: KpiTone;
  to: string;
}) {
  const total = useCount(resource);
  return (
    <View className="w-[48%]">
      <KpiCard
        label={label}
        value={total ?? "—"}
        icon={icon}
        tone={tone}
        mono
        to={to}
      />
    </View>
  );
}

interface AuditLog extends BaseRecord {
  action?: string;
  entity?: string;
  createdAt?: string;
}

function RecentActivity() {
  const router = useRouter();
  const { query, result } = useList<AuditLog>({
    resource: "audit-logs",
    pagination: { pageSize: 8 },
    sorters: [{ field: "createdAt", order: "desc" }],
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const isLoading = query.isLoading;
  const rows = result.data ?? [];

  return (
    <View className="rounded-lg border border-border bg-card">
      <View className="flex-row items-center justify-between border-b border-border p-4">
        <Text className="font-sans-semibold text-base text-card-foreground">
          Recent activity
        </Text>
        <Text
          onPress={() => router.push("/audit-logs")}
          className="text-xs text-primary"
        >
          View all
        </Text>
      </View>
      {isLoading ? (
        <Text className="p-4 text-sm text-muted-foreground">Loading…</Text>
      ) : rows.length === 0 ? (
        <Text className="p-4 text-sm text-muted-foreground">No activity yet.</Text>
      ) : (
        rows.map((log, i) => (
          <View
            key={log.id ?? i}
            className={i > 0 ? "flex-row items-center gap-3 border-t border-border p-3" : "flex-row items-center gap-3 p-3"}
          >
            {log.action ? <StatusBadge label={log.action} /> : null}
            <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
              {log.entity ?? "—"}
            </Text>
            {log.createdAt ? (
              <Text className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

export default function DashboardScreen() {
  return (
    <Screen title="Dashboard" tabBar>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          <Kpi label="Materials" resource="materials" icon={Package} tone="primary" to="/materials" />
          <Kpi label="Tools" resource="tools" icon={Wrench} tone="info" to="/tools" />
          <Kpi label="Projects" resource="projects" icon={FolderKanban} tone="success" to="/projects" />
          <Kpi label="Locations" resource="locations" icon={Factory} tone="warning" to="/locations" />
        </View>

        <Can resource="audit-logs" action="list">
          <RecentActivity />
        </Can>
      </ScrollView>
    </Screen>
  );
}
