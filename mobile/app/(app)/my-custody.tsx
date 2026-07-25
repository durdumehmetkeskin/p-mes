import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Boxes, PackageCheck, Package, Wrench } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

import { EmptyState } from "@/components/refine-ui/empty-state";
import { Screen } from "@/components/refine-ui/screen";
import { SegmentedTabs } from "@/components/refine-ui/segmented-tabs";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

interface MyStockItem {
  id: string;
  quantity: number;
  status: string;
  receivedAt: string | null;
  material: { code: string; name: string; unit: string | null } | null;
  lot: { lotNumber: string } | null;
  warehouse: { code: string } | null;
  orderNumber: string | null;
  stageName: string | null;
}
interface MyTool {
  id: string;
  status: string;
  receivedAt: string | null;
  tool: { id: string; code: string; name: string } | null;
  stageName: string | null;
  reservedFrom?: string | null;
  reservedTo?: string | null;
}
interface MyProduct {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string | null;
  receivedAt: string | null;
  stageName: string | null;
}
interface HistoryRecord {
  id: string;
  itemType: "stock_item" | "tool" | "product";
  itemCode: string;
  itemName: string;
  lotNumber: string | null;
  unit: string | null;
  quantity: number | null;
  orderNumber: string | null;
  stageName: string | null;
  receivedAt: string;
  closedAt: string | null;
  closeAction: "returned" | "consumed" | "released" | null;
  returnedQuantity: number | null;
  usedQuantity: number | null;
}
interface Bucket {
  stockItems: MyStockItem[];
  tools: MyTool[];
  products: MyProduct[];
}
interface MyCustody {
  pending: Bucket;
  held: Bucket;
  history: HistoryRecord[];
}

const EMPTY: MyCustody = {
  pending: { stockItems: [], tools: [], products: [] },
  held: { stockItems: [], tools: [], products: [] },
  history: [],
};

const TYPE_ICON: Record<HistoryRecord["itemType"], LucideIcon> = {
  stock_item: Package,
  tool: Wrench,
  product: Boxes,
};

const CLOSE_META: Record<
  NonNullable<HistoryRecord["closeAction"]>,
  { tone: "success" | "neutral"; label: string }
> = {
  returned: { tone: "success", label: "iade edildi" },
  consumed: { tone: "neutral", label: "tüketildi" },
  released: { tone: "neutral", label: "serbest bırakıldı" },
};

const fmt = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString() : "—";

function pendingBadge(status: string) {
  if (status === "reserving")
    return <StatusBadge tone="neutral" label="hazırlanıyor" />;
  if (status === "delivering")
    return <StatusBadge tone="warning" label="teslim yolda" />;
  return <StatusBadge tone="warning" label="teslim alınacak" />;
}

function heldBadge(status: string) {
  return (
    <StatusBadge
      tone={status === "returning" ? "warning" : "info"}
      label={status === "returning" ? "iade yolda" : "üzerimde"}
    />
  );
}

function SectionHeader({ icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon icon={icon} size={14} color={colors.primary} />
      <Text className="text-[10px] font-sans-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </Text>
    </View>
  );
}

function Row({
  title,
  subtitle,
  right,
  badge,
}: {
  title: string;
  subtitle?: string;
  right?: string;
  badge?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-2 border-t border-border py-2">
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-sans-medium text-foreground" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? (
        <Text className="font-mono text-xs text-muted-foreground">{right}</Text>
      ) : null}
      {badge}
    </View>
  );
}

/** One bucket (pending or held) rendered as three titled item groups. */
function BucketView({
  bucket,
  badge,
  emptyMessage,
}: {
  bucket: Bucket;
  badge: (status: string) => React.ReactNode;
  emptyMessage: string;
}) {
  const total =
    bucket.stockItems.length + bucket.tools.length + bucket.products.length;
  if (total === 0) {
    return <EmptyState icon={PackageCheck} title="Kayıt yok" message={emptyMessage} />;
  }
  return (
    <View className="gap-4">
      {bucket.stockItems.length > 0 ? (
        <View className="gap-1 rounded-lg border border-border bg-card p-3">
          <SectionHeader icon={Package} title={`Malzemeler (${bucket.stockItems.length})`} />
          {bucket.stockItems.map((it) => (
            <Row
              key={it.id}
              title={`${it.material?.code ?? "—"} · ${it.material?.name ?? ""}`}
              subtitle={[
                it.lot?.lotNumber,
                it.warehouse?.code,
                it.stageName,
                it.orderNumber,
              ]
                .filter(Boolean)
                .join(" · ")}
              right={`${it.quantity} ${it.material?.unit ?? ""}`}
              badge={badge(it.status)}
            />
          ))}
        </View>
      ) : null}

      {bucket.tools.length > 0 ? (
        <View className="gap-1 rounded-lg border border-border bg-card p-3">
          <SectionHeader icon={Wrench} title={`Araçlar (${bucket.tools.length})`} />
          {bucket.tools.map((t) => (
            <Row
              key={t.id}
              title={`${t.tool?.code ?? "—"} · ${t.tool?.name ?? ""}`}
              subtitle={[
                t.stageName ? `Aşama: ${t.stageName}` : null,
                t.receivedAt
                  ? fmt(t.receivedAt)
                  : t.reservedFrom
                    ? `${fmt(t.reservedFrom)} → ${fmt(t.reservedTo)}`
                    : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              badge={badge(t.status)}
            />
          ))}
        </View>
      ) : null}

      {bucket.products.length > 0 ? (
        <View className="gap-1 rounded-lg border border-border bg-card p-3">
          <SectionHeader icon={Boxes} title={`Ürünler (${bucket.products.length})`} />
          {bucket.products.map((p) => (
            <Row
              key={p.id}
              title={`${p.code} · ${p.name}`}
              subtitle={p.stageName ? `Girdi: ${p.stageName}` : undefined}
              right={`${p.quantity} ${p.unit ?? ""}`}
              badge={badge("pending-product")}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * "Zimmetlerim" — the user's full custody picture: pending pickups, current
 * holdings and the immutable return/consume history (custody ledger). Data is
 * self-scoped server-side; the page is visible to every authenticated user.
 */
export default function MyCustodyScreen() {
  const [tab, setTab] = useState("pending");
  const [data, setData] = useState<MyCustody | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: d } = await axiosInstance.get<MyCustody>("/my-work/custody");
      setData(d ?? EMPTY);
    } catch {
      setData(EMPTY);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const d = data ?? EMPTY;
  const pendingCount =
    d.pending.stockItems.length + d.pending.tools.length + d.pending.products.length;
  const heldCount =
    d.held.stockItems.length + d.held.tools.length + d.held.products.length;

  return (
    <Screen title="Zimmetlerim" canGoBack>
      <SegmentedTabs
        tabs={[
          { key: "pending", label: `Teslim Alınacak (${pendingCount})` },
          { key: "held", label: `Üzerimde (${heldCount})` },
          { key: "history", label: `Geçmiş (${d.history.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.mutedForeground}
          />
        }
      >
        {data === null ? (
          <View className="gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </View>
        ) : tab === "pending" ? (
          <BucketView
            bucket={d.pending}
            badge={pendingBadge}
            emptyMessage="Teslim almanız gereken bir şey yok."
          />
        ) : tab === "held" ? (
          <BucketView
            bucket={d.held}
            badge={heldBadge}
            emptyMessage="Üzerinize teslim edilmiş malzeme, araç veya ürün yok."
          />
        ) : d.history.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Geçmiş boş"
            message="Teslim aldıklarınız iade edildiğinde veya tüketildiğinde burada listelenir."
          />
        ) : (
          <View className="gap-1 rounded-lg border border-border bg-card p-3">
            <Text className="text-[10px] font-sans-semibold uppercase tracking-widest text-muted-foreground">
              İade / Tüketim Geçmişi ({d.history.length})
            </Text>
            {d.history.map((r) => {
              const meta = r.closeAction ? CLOSE_META[r.closeAction] : null;
              return (
                <View
                  key={r.id}
                  className="flex-row items-center gap-2 border-t border-border py-2"
                >
                  <Icon
                    icon={TYPE_ICON[r.itemType] ?? Package}
                    size={14}
                    color={colors.mutedForeground}
                  />
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-sm font-sans-medium text-foreground"
                      numberOfLines={1}
                    >
                      {r.itemCode} · {r.itemName}
                    </Text>
                    <Text className="text-xs text-muted-foreground" numberOfLines={2}>
                      {[
                        r.lotNumber ? `Lot ${r.lotNumber}` : null,
                        r.stageName,
                        r.orderNumber,
                        `${fmt(r.receivedAt)} → ${fmt(r.closedAt)}`,
                        r.closeAction === "returned" && r.returnedQuantity != null
                          ? `iade ${r.returnedQuantity}${r.unit ?? ""}${
                              r.usedQuantity
                                ? `, kullanılan ${r.usedQuantity}${r.unit ?? ""}`
                                : ""
                            }`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  {r.quantity != null ? (
                    <Text className="font-mono text-xs text-muted-foreground">
                      {r.quantity} {r.unit ?? ""}
                    </Text>
                  ) : null}
                  {meta ? <StatusBadge tone={meta.tone} label={meta.label} /> : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
