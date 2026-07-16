import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { BaseRecord, CrudFilter } from "@refinedev/core";
import { format } from "date-fns";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { axiosInstance } from "@/providers/axios";

interface AuditLog extends BaseRecord {
  id: string;
  action?: string;
  entity?: string;
  actorEmail?: string;
  changedColumns?: string[];
  createdAt?: string;
}

const ACTION_OPTIONS = [
  { label: "CREATE", value: "CREATE" },
  { label: "UPDATE", value: "UPDATE" },
  { label: "DELETE", value: "DELETE" },
];

export default function AuditLogsListScreen() {
  const router = useRouter();
  const [entity, setEntity] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [entities, setEntities] = useState<string[]>([]);

  useEffect(() => {
    axiosInstance
      .get<string[]>("/audit-logs/entities")
      .then((r) => setEntities(r.data ?? []))
      .catch(() => setEntities([]));
  }, []);

  const filters: CrudFilter[] = [
    ...(entity ? [{ field: "entity", operator: "eq" as const, value: entity }] : []),
    ...(action ? [{ field: "action", operator: "eq" as const, value: action }] : []),
  ];

  const header = (
    <View className="gap-2 pb-3">
      <SearchableSelect
        value={entity}
        onChange={setEntity}
        options={entities.map((e) => ({ label: e, value: e }))}
        placeholder="All entities"
        allowClear
      />
      <SearchableSelect
        value={action}
        onChange={setAction}
        options={ACTION_OPTIONS}
        placeholder="All actions"
        searchable={false}
        allowClear
      />
    </View>
  );

  return (
    <ListScreen<AuditLog>
      resource="audit-logs"
      title="Audit Logs"
      tabBar
      filters={filters}
      sorters={[{ field: "createdAt", order: "desc" }]}
      ListHeader={header}
      emptyTitle="No audit entries"
      renderItem={(log) => (
        <Pressable
          onPress={() => router.push(`/audit-logs/${log.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <View className="flex-row items-center justify-between">
            {log.action ? <StatusBadge label={log.action} /> : null}
            {log.createdAt ? (
              <Text className="text-xs text-muted-foreground">
                {format(new Date(log.createdAt), "dd MMM HH:mm")}
              </Text>
            ) : null}
          </View>
          <Text className="mt-1 font-sans-medium text-sm text-foreground">
            {log.entity}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {log.actorEmail ?? "anonymous"}
          </Text>
          {log.changedColumns?.length ? (
            <View className="mt-2 flex-row flex-wrap gap-1">
              {log.changedColumns.slice(0, 6).map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
            </View>
          ) : null}
        </Pressable>
      )}
    />
  );
}
