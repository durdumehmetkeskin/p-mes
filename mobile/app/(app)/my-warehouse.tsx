import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  type BaseRecord,
  useApiUrl,
  useCustom,
  useInvalidate,
  useList,
} from "@refinedev/core";
import { useRouter } from "expo-router";
import {
  ClipboardCheck,
  PackageMinus,
  PackagePlus,
  Shuffle,
  Undo2,
} from "lucide-react-native";

import { ChildList } from "@/components/refine-ui/child-list";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { getWarehouseAccess } from "@/providers/access-control";
import { axiosInstance } from "@/providers/axios";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { colors } from "@/lib/theme";

interface Warehouse extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
}
interface StockItem extends BaseRecord {
  id: string;
  quantity?: number;
  status?: string;
  warehouse?: { code?: string } | null;
  rack?: {
    code?: string;
    zone?: {
      code?: string;
      project?: { code?: string; name?: string } | null;
    } | null;
  } | null;
  order?: { orderNumber?: string } | null;
  stage?: { name?: string; workers?: Array<{ name?: string }> } | null;
  lot?: {
    id?: string;
    lotNumber?: string;
    material?: { code?: string; name?: string } | null;
    project?: { code?: string; name?: string } | null;
  } | null;
}
interface ToolReservation {
  id: string;
  status: string;
  /** False while the tool is in use / mid-handover elsewhere — hide Deliver. */
  deliverable?: boolean;
  tool?: { id: string; code?: string; name?: string } | null;
  stage?: { name?: string; workers?: Array<{ name?: string }> } | null;
  order?: { orderNumber?: string } | null;
}
interface ToolRow extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  status?: string;
  rack?: { code?: string } | null;
}
interface Movement extends BaseRecord {
  id: string;
  type?: string;
  quantity?: number;
  material?: { code?: string } | null;
}

const REFRESH = ["inventory-balances", "inventory-transactions", "tools", "lots", "stock-items"];

export default function MyWarehouseScreen() {
  const router = useRouter();
  const apiUrl = useApiUrl();
  const invalidate = useInvalidate();
  const isAdmin = useIsAdmin();
  const [access, setAccess] = useState<{
    isAdmin: boolean;
    responsibleWarehouseIds: string[];
  } | null>(null);

  useEffect(() => {
    void getWarehouseAccess().then(setAccess);
  }, []);

  const { result: warehouses } = useList<Warehouse>({
    resource: "warehouses",
    pagination: { mode: "off" },
    sorters: [{ field: "code", order: "asc" }],
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const mine = useMemo(() => {
    const all = warehouses?.data ?? [];
    if (!access) return [];
    if (access.isAdmin) return all;
    const ids = new Set(access.responsibleWarehouseIds);
    return all.filter((w) => ids.has(w.id));
  }, [warehouses?.data, access]);

  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  useEffect(() => {
    if (!warehouseId && mine.length) setWarehouseId(mine[0].id);
  }, [mine, warehouseId]);

  const options: SelectOption[] = mine.map((w) => ({
    value: w.id,
    label: [w.code, w.name].filter(Boolean).join(" · "),
  }));
  const whFilter = warehouseId
    ? [{ field: "warehouseId", operator: "eq" as const, value: warehouseId }]
    : [];

  const { result: stock, query: stockQuery } = useList<StockItem>({
    resource: "stock-items",
    pagination: { mode: "off" },
    filters: whFilter,
    queryOptions: { enabled: !!warehouseId, retry: false },
    errorNotification: false,
  });
  const { result: toolResv, query: toolResvQuery } = useCustom<ToolReservation[]>({
    url: `${apiUrl}/tool-reservations`,
    method: "get",
    config: { query: { status: "reserved,returning", warehouseId: warehouseId || undefined } },
    queryOptions: { enabled: !!warehouseId, retry: false },
    errorNotification: false,
  });

  const items = stock?.data ?? [];
  const toolResvRows = Array.isArray(toolResv?.data) ? toolResv.data : [];
  const byStatus = (s: string) => items.filter((i) => i.status === s);
  const prepare = byStatus("reserving");
  const deliverM = byStatus("reserved");
  const returnM = byStatus("returning");
  const deliverT = toolResvRows.filter((r) => r.status === "reserved");
  const returnT = toolResvRows.filter((r) => r.status === "returning");
  const pendingCount =
    prepare.length + deliverM.length + returnM.length + deliverT.length + returnT.length;

  const refreshAll = () => {
    REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
    void stockQuery.refetch();
    void toolResvQuery.refetch();
  };
  const post = (url: string, ok: string) =>
    axiosInstance
      .post(url)
      .then(() => {
        refreshAll();
        Alert.alert("Done", ok);
      })
      .catch((err: { response?: { data?: { message?: string | string[] } } }) => {
        const msg = err?.response?.data?.message;
        Alert.alert("Failed", Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error"));
      });

  // "Prepare" flow: the sheet stays open while the responsible physically
  // prepares the material; Confirm inside it fires confirm-reserve.
  const prepareRef = useRef<BottomSheetModal>(null);
  const [prepareItem, setPrepareItem] = useState<StockItem | null>(null);
  const [preparing, setPreparing] = useState(false);
  const openPrepare = (i: StockItem) => {
    setPrepareItem(i);
    prepareRef.current?.present();
  };
  const confirmPrepare = async () => {
    if (!prepareItem) return;
    setPreparing(true);
    try {
      await axiosInstance.post(`/stock-items/${prepareItem.id}/confirm-reserve`);
      refreshAll();
      prepareRef.current?.dismiss();
      setPrepareItem(null);
      Alert.alert("Done", "Prepared");
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      Alert.alert("Failed", Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error"));
    } finally {
      setPreparing(false);
    }
  };
  const renderPrepareBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const reverse = (id: string) =>
    Alert.alert("Reverse movement", "Post a compensating movement?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reverse", style: "destructive", onPress: () => void post(`/inventory-transactions/${id}/reverse`, "Reversed") },
    ]);

  const action = (label: string, icon: typeof PackagePlus, route: string) => (
    <Button
      variant="outline"
      size="sm"
      className="flex-1"
      label={label}
      leftIcon={<Icon icon={icon} size={16} color={colors.foreground} />}
      onPress={() => router.push(route)}
    />
  );

  const forLabel = (order?: { orderNumber?: string } | null, stage?: { name?: string } | null) =>
    [order?.orderNumber, stage?.name].filter(Boolean).join(" · ") || "—";
  // Who will pick the item up: the reserving stage's workers.
  const recipients = (stage?: { workers?: Array<{ name?: string }> } | null) =>
    (stage?.workers ?? [])
      .map((w) => w.name)
      .filter(Boolean)
      .join(", ");
  const primaryBtn = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      className="rounded-md border border-primary bg-primary px-3 py-1.5 active:opacity-80"
    >
      <Text className="text-xs text-primary-foreground">{label}</Text>
    </Pressable>
  );
  const scanHint = <Text className="text-xs text-muted-foreground">Scan QR</Text>;

  const queueRow = (
    key: string,
    main: string,
    sub: string,
    right: React.ReactNode,
    extra?: string,
  ) => (
    <View key={key} className="flex-row items-center justify-between gap-2 border-t border-border p-3 first:border-0">
      <View className="flex-1 pr-2">
        <Text className="text-sm text-foreground" numberOfLines={1}>{main}</Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>{sub}</Text>
        {extra ? (
          <Text className="text-xs text-primary" numberOfLines={1}>{extra}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  const QueueCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <Text className="border-b border-border p-3 font-sans-semibold text-sm text-card-foreground">
        {title}
      </Text>
      {children}
    </View>
  );

  return (
    <Screen title="My Warehouse" tabBar>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="gap-2">
          <Text className="text-xs font-sans-semibold uppercase tracking-wider text-muted-foreground">
            Warehouse
          </Text>
          <SearchableSelect
            value={warehouseId}
            onChange={setWarehouseId}
            options={options}
            placeholder="Select a warehouse"
          />
        </View>

        {!mine.length ? (
          <View className="rounded-lg border border-border bg-card p-6">
            <Text className="text-center text-sm text-muted-foreground">
              You are not responsible for any warehouse.
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row flex-wrap gap-2">
              {action("Receive", PackagePlus, "/goods-receipt")}
              {action("Issue", PackageMinus, "/goods-issue")}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {action("Transfer", Shuffle, "/goods-transfer")}
              {action("Count", ClipboardCheck, "/stock-count")}
            </View>

            {/* ---- Pending work ---- */}
            {pendingCount === 0 ? (
              <View className="rounded-lg border border-border bg-card p-6">
                <Text className="text-center text-sm text-muted-foreground">
                  Nothing pending. 🎉
                </Text>
              </View>
            ) : null}

            {prepare.length > 0 && (
              <QueueCard title={`Prepare materials (${prepare.length})`}>
                {prepare.map((i) =>
                  queueRow(
                    i.id,
                    `${i.lot?.material?.code ?? "—"} · ${i.lot?.lotNumber ?? ""}`,
                    `${i.quantity} · ${forLabel(i.order, i.stage)}`,
                    primaryBtn("Prepare", () => openPrepare(i)),
                  ),
                )}
              </QueueCard>
            )}
            {deliverM.length > 0 && (
              <QueueCard title={`Deliver materials (${deliverM.length})`}>
                {deliverM.map((i) =>
                  queueRow(
                    i.id,
                    `${i.lot?.material?.code ?? "—"} · ${i.lot?.lotNumber ?? ""}`,
                    `${i.quantity} · ${forLabel(i.order, i.stage)}`,
                    isAdmin
                      ? primaryBtn("Deliver", () => void post(`/stock-items/${i.id}/deliver`, "Delivered"))
                      : scanHint,
                    recipients(i.stage)
                      ? `Teslim alacak: ${recipients(i.stage)}`
                      : undefined,
                  ),
                )}
              </QueueCard>
            )}
            {returnM.length > 0 && (
              <QueueCard title={`Material returns (${returnM.length})`}>
                {returnM.map((i) =>
                  queueRow(
                    i.id,
                    `${i.lot?.material?.code ?? "—"} · ${i.lot?.lotNumber ?? ""}`,
                    `${i.quantity} · ${forLabel(i.order, i.stage)}`,
                    isAdmin
                      ? primaryBtn("Receive", () => router.push(`/stock-items/${i.id}/handover`))
                      : scanHint,
                  ),
                )}
              </QueueCard>
            )}
            {deliverT.length > 0 && (
              <QueueCard title={`Deliver tools (${deliverT.length})`}>
                {deliverT.map((r) =>
                  queueRow(
                    r.id,
                    `${r.tool?.code ?? "—"} · ${r.tool?.name ?? ""}`,
                    forLabel(r.order, r.stage),
                    r.deliverable === false ? (
                      <Text className="text-xs text-muted-foreground">
                        Araç müsait değil
                      </Text>
                    ) : isAdmin ? (
                      primaryBtn("Deliver", () => void post(`/tool-reservations/${r.id}/deliver`, "Delivered"))
                    ) : (
                      scanHint
                    ),
                    recipients(r.stage)
                      ? `Teslim alacak: ${recipients(r.stage)}`
                      : undefined,
                  ),
                )}
              </QueueCard>
            )}
            {returnT.length > 0 && (
              <QueueCard title={`Tool returns (${returnT.length})`}>
                {returnT.map((r) =>
                  queueRow(
                    r.id,
                    `${r.tool?.code ?? "—"} · ${r.tool?.name ?? ""}`,
                    forLabel(r.order, r.stage),
                    isAdmin
                      ? primaryBtn("Receive", () => void post(`/tool-reservations/${r.id}/receive-return`, "Received"))
                      : scanHint,
                  ),
                )}
              </QueueCard>
            )}

            {/* ---- Stock (reservation-detailed) ---- */}
            <View className="overflow-hidden rounded-lg border border-border bg-card">
              <Text className="border-b border-border p-3 font-sans-semibold text-sm text-card-foreground">
                Stock
              </Text>
              {items.filter((i) => i.status !== "consumed").length === 0 ? (
                <Text className="p-3 text-sm text-muted-foreground">No stock in this warehouse.</Text>
              ) : (
                items
                  .filter((i) => i.status !== "consumed")
                  .map((i, idx) => (
                    <Pressable
                      key={i.id}
                      onPress={() => i.lot?.id && router.push(`/lots/${i.lot.id}`)}
                      className={`gap-1 p-3 active:bg-accent ${idx > 0 ? "border-t border-border" : ""}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 pr-2 font-sans-medium text-sm text-foreground" numberOfLines={1}>
                          {i.lot?.material?.code ?? "—"} · {i.lot?.lotNumber ?? ""}
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <Text className="font-mono text-xs text-muted-foreground">{i.quantity}</Text>
                          {i.status ? <StatusBadge label={i.status} /> : null}
                        </View>
                      </View>
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {[i.warehouse?.code, i.rack?.zone?.code, i.rack?.code].filter(Boolean).join(" / ")}
                        {i.order || i.stage ? `  ·  ${forLabel(i.order, i.stage)}` : ""}
                        {i.lot?.project?.code ? `  ·  ${i.lot.project.code}` : ""}
                      </Text>
                    </Pressable>
                  ))
              )}
            </View>

            <ChildList<ToolRow>
              resource="tools"
              title="Tools"
              filters={whFilter}
              emptyText="No tools in this warehouse"
              renderItem={(t) => (
                <Pressable
                  onPress={() => router.push(`/tools/${t.id}`)}
                  className="flex-row items-center justify-between p-3 active:bg-accent"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-sm text-foreground">{t.name}</Text>
                    <Text className="font-mono text-xs text-muted-foreground">
                      {[t.rack?.code, t.code].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  {t.status ? <StatusBadge label={t.status} /> : null}
                </Pressable>
              )}
            />

            <ChildList<Movement>
              resource="inventory-transactions"
              title="Recent Movements"
              filters={whFilter}
              sorters={[{ field: "createdAt", order: "desc" }]}
              pageSize={25}
              emptyText="No movements for this warehouse"
              renderItem={(m) => (
                <View className="flex-row items-center justify-between p-3">
                  <View className="flex-1 pr-2">
                    <Text className="text-sm text-foreground">{m.material?.code ?? "—"}</Text>
                    <Text className="text-xs text-muted-foreground">
                      {m.type} · {m.quantity}
                    </Text>
                  </View>
                  <Button
                    variant="outline"
                    size="sm"
                    label="Reverse"
                    leftIcon={<Icon icon={Undo2} size={14} color={colors.foreground} />}
                    onPress={() => reverse(m.id)}
                  />
                </View>
              )}
            />
          </>
        )}
      </ScrollView>

      {/* ---- Prepare material sheet (reserving → reserved) ---- */}
      <BottomSheetModal
        ref={prepareRef}
        enableDynamicSizing
        backdropComponent={renderPrepareBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
        onDismiss={() => {
          if (!preparing) setPrepareItem(null);
        }}
      >
        <BottomSheetView>
          <SafeAreaView edges={["bottom"]}>
            <View className="gap-1 px-4 pb-4 pt-2">
              <Text className="pb-2 font-sans-semibold text-base text-card-foreground">
                Prepare material
              </Text>
              {(() => {
                const p =
                  prepareItem?.lot?.project ?? prepareItem?.rack?.zone?.project;
                const row = (label: string, value?: string | null) => (
                  <View className="flex-row items-start justify-between gap-3 border-b border-border py-2">
                    <Text className="text-xs text-muted-foreground">{label}</Text>
                    <Text
                      className="flex-1 text-right text-sm text-foreground"
                      numberOfLines={2}
                    >
                      {value || "—"}
                    </Text>
                  </View>
                );
                return (
                  <>
                    {row(
                      "Material",
                      prepareItem?.lot?.material
                        ? [
                            prepareItem.lot.material.code,
                            prepareItem.lot.material.name,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : null,
                    )}
                    {row("Lot", prepareItem?.lot?.lotNumber)}
                    {row(
                      "Quantity",
                      prepareItem?.quantity != null
                        ? String(prepareItem.quantity)
                        : null,
                    )}
                    {row("Project", p ? [p.code, p.name].filter(Boolean).join(" · ") : null)}
                    {row("Order", prepareItem?.order?.orderNumber)}
                    {row("Stage", prepareItem?.stage?.name)}
                    {row("Teslim alacak", recipients(prepareItem?.stage))}
                    {row(
                      "Location",
                      [
                        prepareItem?.warehouse?.code,
                        prepareItem?.rack?.zone?.code,
                        prepareItem?.rack?.code,
                      ]
                        .filter(Boolean)
                        .join(" / "),
                    )}
                  </>
                );
              })()}
              <Text className="pb-2 pt-2 text-xs text-muted-foreground">
                Malzemeyi hazırladıktan sonra Confirm ile onaylayın.
              </Text>
              <Button
                size="lg"
                label={preparing ? "Confirming…" : "Confirm"}
                disabled={preparing}
                onPress={() => void confirmPrepare()}
              />
            </View>
          </SafeAreaView>
        </BottomSheetView>
      </BottomSheetModal>
    </Screen>
  );
}
