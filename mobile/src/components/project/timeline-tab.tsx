import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { type BaseRecord, useList } from "@refinedev/core";

import { EmptyState } from "@/components/refine-ui/empty-state";
import { SimpleGantt, type GanttRow } from "@/components/charts/simple-gantt";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { colors } from "@/lib/theme";

interface Stage extends BaseRecord {
  id: string;
  name?: string;
  status?: string;
  sequence?: number;
  startedAt?: string;
  completedAt?: string;
  durationHours?: number;
  estimatedStartDate?: string;
  estimatedCompletedDate?: string;
  estimatedDurationHours?: number;
}
interface Process extends BaseRecord {
  id: string;
  category?: { name?: string };
  stages?: Stage[];
}

const STATUS_COLOR: Record<string, string> = {
  completed: colors.success,
  in_progress: colors.info,
  pending: colors.mutedForeground,
  draft: colors.mutedForeground,
};

function ms(s?: string): number | null {
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? null : t;
}

export function TimelineTab({ projectId }: { projectId: string }) {
  const { result: orderRes } = useList<BaseRecord>({
    resource: "orders",
    filters: [{ field: "projectId", operator: "eq", value: projectId }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const orders = orderRes?.data ?? [];
  const [orderId, setOrderId] = useState<string | null>(null);
  const activeOrder = orderId ?? (orders[0]?.id as string | undefined) ?? null;

  const { result: procRes } = useList<Process>({
    resource: "processes",
    filters: activeOrder
      ? [{ field: "orderId", operator: "eq", value: activeOrder }]
      : [],
    sorters: [{ field: "createdAt", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!activeOrder, retry: false },
    errorNotification: false,
  });
  const processes = procRes?.data ?? [];

  const rows: GanttRow[] = [];
  let min = Infinity;
  let max = -Infinity;
  processes.forEach((p) => {
    [...(p.stages ?? [])]
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
      .forEach((s) => {
        const start = ms(s.estimatedStartDate) ?? ms(s.startedAt);
        let end = ms(s.estimatedCompletedDate) ?? ms(s.completedAt);
        if (start != null && end == null) {
          const hours = s.estimatedDurationHours ?? s.durationHours;
          if (hours) end = start + hours * 3600000;
        }
        if (start == null || end == null) return;
        min = Math.min(min, start);
        max = Math.max(max, end);
        rows.push({
          label: s.name ?? "Stage",
          bars: [
            {
              start,
              end,
              color: STATUS_COLOR[s.status ?? "pending"] ?? colors.primary,
            },
          ],
        });
      });
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {orders.length > 1 ? (
        <View className="gap-1.5">
          <Label>Order</Label>
          <SearchableSelect
            value={activeOrder}
            onChange={setOrderId}
            options={orders.map((o) => ({
              label: String(o.orderNumber ?? o.id),
              value: String(o.id),
            }))}
            searchable={false}
          />
        </View>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No scheduled stages"
          message="Stages with estimated start/end dates appear on the timeline."
        />
      ) : (
        <SimpleGantt rows={rows} domainStart={min} domainEnd={max} />
      )}
    </ScrollView>
  );
}
