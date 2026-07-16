import { ScrollView, Text, View } from "react-native";
import { type BaseRecord, useOne } from "@refinedev/core";
import { format } from "date-fns";
import { useLocalSearchParams } from "expo-router";

import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLog extends BaseRecord {
  id: string;
  action?: string;
  entity?: string;
  entityId?: string;
  actorEmail?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  changedColumns?: string[];
  createdAt?: string;
}

const IGNORE = new Set(["id", "createdAt", "updatedAt"]);

function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v))
    return v
      .map((x) =>
        x && typeof x === "object" && "name" in x
          ? String((x as { name: unknown }).name)
          : String(x),
      )
      .join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function computeChanges(
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
): { field: string; before: unknown; after: unknown }[] {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const out: { field: string; before: unknown; after: unknown }[] = [];
  keys.forEach((k) => {
    if (IGNORE.has(k)) return;
    const b = before?.[k];
    const a = after?.[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      out.push({ field: k, before: b, after: a });
    }
  });
  return out;
}

export default function AuditLogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { query, result } = useOne<AuditLog>({ resource: "audit-logs", id });
  const log = result;

  const changes =
    log?.action === "UPDATE" ? computeChanges(log.before, log.after) : [];

  return (
    <Screen title="Audit entry" subtitle={log?.entity} canGoBack>
      {query.isLoading ? (
        <View className="p-4">
          <Skeleton className="h-48 w-full" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Entry</SectionLabel>
              {log?.action ? <StatusBadge label={log.action} /> : null}
            </View>
            <FieldRow label="Entity" value={log?.entity} />
            <FieldRow label="Entity ID" value={log?.entityId} mono />
            <FieldRow label="Actor" value={log?.actorEmail ?? "anonymous"} />
            <FieldRow
              label="When"
              value={
                log?.createdAt
                  ? format(new Date(log.createdAt), "dd MMM yyyy HH:mm")
                  : undefined
              }
            />
          </View>

          {changes.length ? (
            <View className="overflow-hidden rounded-lg border border-border bg-card">
              <View className="border-b border-border p-3">
                <Text className="font-sans-semibold text-sm text-card-foreground">
                  Changes ({changes.length})
                </Text>
              </View>
              {changes.map((c, i) => (
                <View
                  key={c.field}
                  className={i > 0 ? "border-t border-border p-3" : "p-3"}
                >
                  <Text className="font-mono text-xs text-muted-foreground">
                    {c.field}
                  </Text>
                  <View className="mt-1 flex-row gap-2">
                    <Text className="flex-1 text-sm text-destructive">
                      {formatValue(c.before)}
                    </Text>
                    <Text className="flex-1 text-sm text-success">
                      {formatValue(c.after)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {log?.action !== "UPDATE" ? (
            <View className="rounded-lg border border-border bg-card p-4">
              <SectionLabel>
                {log?.action === "DELETE" ? "Deleted record" : "Created record"}
              </SectionLabel>
              <Text className="mt-1 font-mono text-xs text-muted-foreground">
                {JSON.stringify(
                  log?.action === "DELETE" ? log?.before : log?.after,
                  null,
                  2,
                )}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
