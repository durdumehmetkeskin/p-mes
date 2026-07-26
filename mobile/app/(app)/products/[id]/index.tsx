import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { type BaseRecord, useList, useOne } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Boxes,
  CheckCircle2,
  Factory,
  PackageCheck,
  Undo2,
  UserCheck,
  type LucideIcon,
} from "lucide-react-native";

import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { showApiError } from "@/components/ui/error-alert";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

interface Product extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  quantity?: number;
  handoverStatus?: "produced" | "delivering" | "received";
  materialUnit?: { name?: string } | null;
  stage?: { name?: string } | null;
  originStageName?: string | null;
  order?: { orderNumber?: string } | null;
  storageRack?: {
    code?: string;
    storage?: { code?: string; location?: { name?: string } | null } | null;
  } | null;
  deliveredByUser?: { name?: string } | null;
  receivedByUser?: { name?: string } | null;
  consumedByStageId?: string | null;
  consumedByStage?: { name?: string } | null;
  inputReceivedByUser?: { name?: string } | null;
  inputReceivedAt?: string | null;
}
interface StorageRackRow extends BaseRecord {
  id: string;
  code?: string;
  storage?: { location?: { code?: string; name?: string } | null } | null;
}
interface JourneyEvent {
  type: "produced" | "stored" | "received" | "processed" | "released";
  at: string;
  stageName: string | null;
  user: string | null;
  location: string | null;
}

const EVENT_META: Record<
  JourneyEvent["type"],
  { label: string; icon: LucideIcon; tone: "success" | "info" | "neutral" }
> = {
  produced: { label: "Üretildi", icon: Factory, tone: "info" },
  stored: { label: "Depoya bırakıldı", icon: Boxes, tone: "neutral" },
  received: { label: "Teslim alındı", icon: UserCheck, tone: "info" },
  processed: { label: "İşlendi", icon: CheckCircle2, tone: "success" },
  released: { label: "Serbest bırakıldı", icon: Undo2, tone: "neutral" },
};

const fmtAt = (v: string) => {
  const d = new Date(v);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

/**
 * The PRODUCT CARD, opened by scanning the product's QR: identity + current
 * state, the full processing journey (which stage, by whom, where, when —
 * from GET /products/:id/journey), the QR-gated input pickup and the storage
 * drop-off. A product flows through stages: each completed stage re-stamps it
 * as that stage's output, and every step lands on this timeline.
 */
export default function ProductCardScreen() {
  const { id, scanned } = useLocalSearchParams<{
    id: string;
    scanned?: string;
  }>();
  const productId = id as string;
  const router = useRouter();
  // Reached via QR scan → physical presence proven, the direct input-receive
  // (custody) action is unlocked (same rule as stock-item handover).
  const viaScan = scanned === "1";
  const [busy, setBusy] = useState(false);
  const [rackId, setRackId] = useState<string | null>(null);

  const { result: product, query } = useOne<Product>({
    resource: "products",
    id: productId,
    errorNotification: false,
    queryOptions: { retry: false },
  });

  // Processing journey (self-refreshing after each action).
  const [journey, setJourney] = useState<JourneyEvent[] | null>(null);
  const loadJourney = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get<JourneyEvent[]>(
        `/products/${productId}/journey`,
      );
      setJourney(Array.isArray(data) ? data : []);
    } catch {
      setJourney([]);
    }
  }, [productId]);
  useEffect(() => {
    void loadJourney();
  }, [loadJourney]);

  const status = product?.handoverStatus ?? "produced";
  const canStore = status !== "received";

  const { result: racks } = useList<StorageRackRow>({
    resource: "storage-racks",
    pagination: { mode: "off" },
    queryOptions: { retry: false, enabled: canStore },
    errorNotification: false,
  });
  const options: SelectOption[] = (racks?.data ?? []).map((r) => ({
    value: String(r.id),
    label: [r.storage?.location?.name ?? r.storage?.location?.code, r.code]
      .filter(Boolean)
      .join(" · "),
  }));

  const refreshAll = () => {
    void query.refetch();
    void loadJourney();
  };
  const fail = (err: unknown) => showApiError(err);

  const store = () => {
    if (!rackId) return;
    setBusy(true);
    axiosInstance
      .post(`/products/${productId}/store`, { storageRackId: rackId })
      .then(refreshAll)
      .catch(fail)
      .finally(() => setBusy(false));
  };

  // A worker of the CONSUMING stage takes custody of the input product.
  const receiveInput = () => {
    setBusy(true);
    axiosInstance
      .post(`/products/${productId}/receive-input`)
      .then(refreshAll)
      .catch(fail)
      .finally(() => setBusy(false));
  };

  return (
    <Screen title="Ürün kartı" subtitle={product?.name} canGoBack>
      {query.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-40 w-full" />
        </View>
      ) : !product ? (
        <View className="p-4">
          <Text className="text-sm text-muted-foreground">
            Could not load this product.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Product</SectionLabel>
              <StatusBadge label={status} />
            </View>
            <FieldRow
              label="Product"
              value={[product.code, product.name].filter(Boolean).join(" · ")}
            />
            <FieldRow
              label="Quantity"
              value={
                product.quantity != null
                  ? `${product.quantity} ${product.materialUnit?.name ?? ""}`.trim()
                  : undefined
              }
            />
            <FieldRow
              label="Üretildiği aşama"
              value={product.originStageName ?? product.stage?.name}
            />
            <FieldRow label="Şu anki aşama" value={product.stage?.name} />
            <FieldRow label="Order" value={product.order?.orderNumber} />
            <FieldRow
              label="Stored at"
              value={
                [
                  product.storageRack?.storage?.location?.name ??
                    product.storageRack?.storage?.code,
                  product.storageRack?.code,
                ]
                  .filter(Boolean)
                  .join(" / ") || undefined
              }
            />
            {product.consumedByStage?.name ? (
              <FieldRow
                label="Girdisi olduğu aşama"
                value={product.consumedByStage.name}
              />
            ) : null}
          </View>

          {/* İşlem geçmişi — the product's journey through the stages. */}
          <View className="rounded-lg border border-border bg-card p-4">
            <SectionLabel>İşlem Geçmişi</SectionLabel>
            {journey === null ? (
              <View className="mt-2">
                <Skeleton className="h-16 w-full" />
              </View>
            ) : journey.length === 0 ? (
              <Text className="mt-2 text-xs text-muted-foreground">
                Henüz kayıtlı işlem yok.
              </Text>
            ) : (
              <View className="mt-1">
                {journey.map((e, i) => {
                  const meta = EVENT_META[e.type];
                  return (
                    <View
                      key={`${e.type}-${e.at}-${i}`}
                      className={
                        i > 0
                          ? "flex-row items-center gap-2 border-t border-border py-2"
                          : "flex-row items-center gap-2 py-2"
                      }
                    >
                      <Icon
                        icon={meta.icon}
                        size={16}
                        color={
                          meta.tone === "success"
                            ? colors.success
                            : meta.tone === "info"
                              ? colors.info
                              : colors.mutedForeground
                        }
                      />
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-sans-medium text-foreground">
                          {meta.label}
                          {e.stageName ? ` — ${e.stageName}` : ""}
                        </Text>
                        <Text
                          className="text-xs text-muted-foreground"
                          numberOfLines={2}
                        >
                          {[
                            e.user ? `Kişi: ${e.user}` : null,
                            e.location ? `Konum: ${e.location}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </Text>
                      </View>
                      <Text className="font-mono text-[11px] text-muted-foreground">
                        {fmtAt(e.at)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Input pickup: a worker of the CONSUMING stage takes custody —
              unlocked by scanning the product QR (backend mirrors with 403). */}
          {product.consumedByStageId ? (
            product.inputReceivedAt ? (
              <View className="rounded-lg border border-border bg-card p-4">
                <FieldRow
                  label="Teslim alan"
                  value={product.inputReceivedByUser?.name ?? "—"}
                />
                <FieldRow
                  label="Teslim tarihi"
                  value={new Date(product.inputReceivedAt).toLocaleString()}
                />
              </View>
            ) : (
              <View className="gap-2 rounded-lg border border-border bg-card p-4">
                <Text className="text-xs text-muted-foreground">
                  Bu ürün "{product.consumedByStage?.name ?? "aşama"}" girdisi —
                  aşama çalışanı teslim almalı.
                </Text>
                {viaScan ? (
                  <Button
                    label="Teslim al (zimmetine geçer)"
                    disabled={busy}
                    onPress={receiveInput}
                  />
                ) : (
                  <Button
                    label="Teslim al — QR okut"
                    disabled={busy}
                    onPress={() => router.push("/scan")}
                  />
                )}
              </View>
            )
          ) : null}

          {canStore ? (
            <View className="gap-3 rounded-lg border border-border bg-card p-4">
              <Label>Depo rafı</Label>
              <SearchableSelect
                value={rackId}
                onChange={setRackId}
                options={options}
                placeholder="Lokasyon rafı seçin…"
              />
              <Button
                label="Depoya bırak"
                disabled={!rackId || busy}
                loading={busy}
                onPress={store}
              />
            </View>
          ) : (
            <Text className="text-sm text-muted-foreground">
              Bu ürün depoya bırakılmış — yapılacak işlem yok.
            </Text>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
