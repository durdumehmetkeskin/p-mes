import type { ReactNode } from "react";
import { Text, View } from "react-native";
import {
  type BaseRecord,
  type CrudFilter,
  type CrudSort,
  useList,
} from "@refinedev/core";

/** Titled card that embeds a related resource list inside a detail screen. */
export function ChildList<T extends BaseRecord>({
  resource,
  filters,
  sorters,
  title,
  renderItem,
  emptyText = "None",
  pageSize,
}: {
  resource: string;
  filters?: CrudFilter[];
  sorters?: CrudSort[];
  title: string;
  renderItem: (item: T) => ReactNode;
  emptyText?: string;
  pageSize?: number;
}) {
  const { query, result } = useList<T>({
    resource,
    filters,
    sorters,
    pagination: pageSize ? { pageSize } : { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const rows = result?.data ?? [];

  return (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <View className="border-b border-border p-3">
        <Text className="font-sans-semibold text-sm text-card-foreground">
          {title}
          {rows.length ? ` (${rows.length})` : ""}
        </Text>
      </View>
      {query.isLoading ? (
        <Text className="p-3 text-sm text-muted-foreground">Loading…</Text>
      ) : rows.length === 0 ? (
        <Text className="p-3 text-sm text-muted-foreground">{emptyText}</Text>
      ) : (
        rows.map((item, i) => (
          <View
            key={item.id ?? i}
            className={i > 0 ? "border-t border-border" : undefined}
          >
            {renderItem(item)}
          </View>
        ))
      )}
    </View>
  );
}
