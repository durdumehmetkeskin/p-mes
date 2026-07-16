import { Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { format } from "date-fns";
import { PackageX, User, Warehouse } from "lucide-react-native";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Icon } from "@/components/ui/icon";
import { colors } from "@/lib/theme";

type EndpointKind = "warehouse" | "user" | "external" | "none";
interface Txn extends BaseRecord {
  id: string;
  type?: string;
  quantity?: string | number;
  note?: string;
  createdAt?: string;
  material?: BaseRecord;
  from?: string;
  fromKind?: EndpointKind;
  to?: string;
  toKind?: EndpointKind;
}

function Endpoint({ label, kind }: { label?: string; kind?: EndpointKind }) {
  const glyph =
    kind === "user" ? User : kind === "warehouse" ? Warehouse : kind === "external" ? PackageX : null;
  return (
    <View className="flex-row items-center gap-1">
      {glyph ? <Icon icon={glyph} size={12} color={colors.mutedForeground} /> : null}
      <Text className="text-xs text-muted-foreground">{label ?? "—"}</Text>
    </View>
  );
}

export default function InventoryTransactionsListScreen() {
  return (
    <ListScreen<Txn>
      resource="inventory-transactions"
      title="Stock Movements"
      tabBar
      emptyTitle="No movements"
      emptyMessage="Stock movements appear here as materials are received, issued or transferred."
      sorters={[{ field: "createdAt", order: "desc" }]}
      renderItem={(t) => (
        <View className="rounded-lg border border-border bg-card p-3">
          <View className="flex-row items-center justify-between">
            {t.type ? <StatusBadge label={t.type} /> : null}
            <Text className="font-mono text-sm text-foreground">
              {t.quantity ?? "0"}
            </Text>
          </View>
          <Text className="mt-1 text-sm text-foreground" numberOfLines={1}>
            {t.material?.code ?? "—"}
          </Text>
          <View className="mt-1 flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-1">
              <Endpoint label={t.from} kind={t.fromKind} />
              <Text className="text-xs text-muted-foreground">→</Text>
              <Endpoint label={t.to} kind={t.toKind} />
            </View>
            {t.createdAt ? (
              <Text className="text-xs text-muted-foreground">
                {format(new Date(t.createdAt), "dd MMM HH:mm")}
              </Text>
            ) : null}
          </View>
          {t.note ? (
            <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
              {t.note}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}
