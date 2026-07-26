import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useGetIdentity, useList, useOne } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import { useIsAdmin } from "@/hooks/use-is-admin";
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
  stageId?: string | null;
  processId?: string | null;
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
  inputReceivedByUser?: { id?: string; name?: string } | null;
  inputReceivedAt?: string | null;
  process?: {
    id: string;
    orderItem?: { sequence?: number; name?: string } | null;
  } | null;
}
interface StorageRackRow extends BaseRecord {
  id: string;
  code?: string;
  storage?: { location?: { code?: string; name?: string } | null } | null;
}
interface ProcessStages extends BaseRecord {
  id: string;
  stages?: Array<{
    id: string;
    name?: string;
    status?: string;
    workers?: Array<{ id: string }>;
    incomingLinks?: Array<{ fromStageId: string; kind?: string }>;
  }>;
}
interface JourneyEnvironment {
  from: string;
  to: string;
  count: number;
  tempMin: number | null;
  tempMax: number | null;
  tempAvg: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
  humidityAvg: number | null;
}
interface JourneyEvent {
  type: "produced" | "stored" | "received" | "processed" | "released";
  at: string;
  stageName: string | null;
  user: string | null;
  location: string | null;
  /** "Location · Section" the stage ran in (from its section reservation). */
  section?: string | null;
  /** Temp/humidity summary over the operation window. */
  environment?: JourneyEnvironment | null;
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
  // Expanded journey rows (section + environment dropdown per stage step).
  const [expandedIdx, setExpandedIdx] = useState<Set<number>>(new Set());
  const toggleExpanded = (i: number) =>
    setExpandedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

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
  const { data: identity } = useGetIdentity<{ id: string }>();
  const isAdmin = useIsAdmin();

  // "Depoya bırak" is shown ONLY while the product is in MY custody (I picked
  // it up as a stage input and it is still on me).
  const inMyCustody = Boolean(
    product?.inputReceivedAt &&
      identity?.id &&
      product?.inputReceivedByUser?.id === identity.id,
  );
  const canStore = inMyCustody && status !== "received";

  // The stage the product is (or would be) the input of: its formal consumer,
  // or — after flow-through — the not-completed io-successor of its current
  // stage (receive-input auto-links onto it). The process fetch also carries
  // each stage's workers for the "is this MY stage" check.
  const { result: processRes } = useOne<ProcessStages>({
    resource: "processes",
    id: product?.processId ?? "",
    errorNotification: false,
    queryOptions: {
      retry: false,
      enabled: Boolean(product?.processId && !product?.inputReceivedAt),
    },
  });
  const targetStage = product?.consumedByStageId
    ? (processRes?.stages ?? []).find((s) => s.id === product.consumedByStageId)
    : (processRes?.stages ?? []).find(
        (s) =>
          s.status !== "completed" &&
          (s.incomingLinks ?? []).some(
            (l) => l.kind === "io" && l.fromStageId === product?.stageId,
          ),
      );
  // "Teslim al" is shown ONLY when the product is an input of a stage I work
  // on (admin: any) — everyone else just sees the info + journey.
  const canReceiveHere = Boolean(
    !product?.inputReceivedAt &&
      targetStage &&
      (isAdmin ||
        (identity?.id &&
          (targetStage.workers ?? []).some((w) => w.id === identity.id))),
  );

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
              label="Kalem"
              value={
                product.process?.orderItem
                  ? [
                      product.process.orderItem.sequence != null
                        ? `#${product.process.orderItem.sequence}`
                        : null,
                      product.process.orderItem.name,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : undefined
              }
            />
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
                  const expandable = Boolean(e.section || e.environment);
                  const isOpen = expandedIdx.has(i);
                  const env = e.environment;
                  return (
                    <View
                      key={`${e.type}-${e.at}-${i}`}
                      className={i > 0 ? "border-t border-border" : undefined}
                    >
                      <Pressable
                        disabled={!expandable}
                        onPress={() => toggleExpanded(i)}
                        className="flex-row items-center gap-2 py-2"
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
                        {expandable ? (
                          <Icon
                            icon={isOpen ? ChevronUp : ChevronDown}
                            size={14}
                            color={colors.mutedForeground}
                          />
                        ) : null}
                      </Pressable>
                      {/* Dropdown: WHERE the stage ran (section) + the
                          temp/humidity over the operation window. */}
                      {expandable && isOpen ? (
                        <View className="mb-2 gap-1 rounded-md border border-border bg-muted/30 p-2">
                          {e.section ? (
                            <Text className="text-xs text-foreground">
                              Bölüm: {e.section}
                            </Text>
                          ) : null}
                          {env ? (
                            <>
                              <Text className="text-xs text-muted-foreground">
                                Aralık: {fmtAt(env.from)} → {fmtAt(env.to)}
                              </Text>
                              {env.count > 0 ? (
                                <>
                                  <Text className="text-xs text-foreground">
                                    Sıcaklık: {env.tempMin ?? "—"}–
                                    {env.tempMax ?? "—"} °C (ort{" "}
                                    {env.tempAvg ?? "—"} °C)
                                  </Text>
                                  <Text className="text-xs text-foreground">
                                    Nem: %{env.humidityMin ?? "—"}–%
                                    {env.humidityMax ?? "—"} (ort %
                                    {env.humidityAvg ?? "—"})
                                  </Text>
                                </>
                              ) : (
                                <Text className="text-xs text-muted-foreground">
                                  Bu aralıkta sensör kaydı yok.
                                </Text>
                              )}
                            </>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Input pickup — ONLY when the product is an input of a stage the
              current user works on (admin: any); unlocked by the QR scan. */}
          {canReceiveHere ? (
            <View className="gap-2 rounded-lg border border-border bg-card p-4">
              <Text className="text-xs text-muted-foreground">
                Bu ürün "
                {product.consumedByStage?.name ?? targetStage?.name ?? "aşama"}
                " girdisi — teslim alın.
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
          ) : null}

          {/* Storage drop-off — ONLY while the product is in MY custody. */}
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
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
