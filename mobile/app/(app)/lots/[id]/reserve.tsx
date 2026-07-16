import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useList, useOne } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/refine-ui/screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { axiosInstance } from "@/providers/axios";

const REFRESH = ["stock-items", "inventory-balances", "lots"];

interface StockItem extends BaseRecord {
  id: string;
  quantity?: number;
  lot?: { projectId?: string | null } | null;
}
interface StageOpt {
  id: string;
  name: string;
}

function Label({ children }: { children: string }) {
  return (
    <Text className="text-xs font-sans-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </Text>
  );
}

export default function ReserveStockScreen() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const router = useRouter();
  const invalidate = useInvalidate();

  const { result: itemResult } = useOne<StockItem>({
    resource: "stock-items",
    id: itemId as string,
  });
  const item = itemResult;
  const max = item?.quantity ?? 0;
  const projectId = item?.lot?.projectId ?? null;

  const [quantity, setQuantity] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [stageId, setStageId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageOpt[]>([]);
  const [busy, setBusy] = useState(false);

  const { result: orders } = useList<BaseRecord>({
    resource: "orders",
    pagination: { mode: "off" },
    filters: projectId
      ? [{ field: "projectId", operator: "eq", value: projectId }]
      : [],
    queryOptions: { enabled: Boolean(projectId), retry: false },
    errorNotification: false,
  });
  const orderOptions: SelectOption[] = (orders?.data ?? []).map((o) => ({
    value: String(o.id),
    label: [o.orderNumber, o.name].filter(Boolean).join(" · "),
  }));

  useEffect(() => {
    setStageId(null);
    setStages([]);
    if (!orderId) return;
    let active = true;
    void axiosInstance
      .get<StageOpt[]>(`/orders/${orderId}/stages`)
      .then((r) => {
        if (active) setStages(r.data ?? []);
      })
      .catch(() => {
        if (active) setStages([]);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  const submit = () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0 || qty > max) {
      Alert.alert("Quantity", `Enter a quantity between 1 and ${max}.`);
      return;
    }
    if (!orderId) {
      Alert.alert("Order", "Select an order.");
      return;
    }
    setBusy(true);
    axiosInstance
      .post(`/stock-items/${itemId}/reserve`, {
        quantity: qty,
        orderId,
        stageId: stageId ?? undefined,
      })
      .then(() => {
        REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
        router.back();
      })
      .catch((err: { response?: { data?: { message?: string | string[] } } }) => {
        const msg = err?.response?.data?.message;
        Alert.alert("Failed", Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error"));
      })
      .finally(() => setBusy(false));
  };

  void id;

  return (
    <Screen title="Reserve stock" subtitle={`${max} available`} canGoBack>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {!projectId ? (
          <View className="rounded-lg border border-border bg-card p-4">
            <Text className="text-sm text-muted-foreground">
              Assign a project to this lot before reserving.
            </Text>
          </View>
        ) : (
          <>
            <View className="gap-2">
              <Label>Quantity</Label>
              <Input
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View className="gap-2">
              <Label>Order</Label>
              <SearchableSelect
                value={orderId}
                onChange={setOrderId}
                options={orderOptions}
                placeholder="Select an order"
              />
            </View>
            <View className="gap-2">
              <Label>Stage (optional)</Label>
              <SearchableSelect
                value={stageId}
                onChange={setStageId}
                options={stages.map((s) => ({ value: s.id, label: s.name }))}
                placeholder={orderId ? "Select a stage" : "Select an order first"}
                disabled={!orderId || stages.length === 0}
                allowClear
              />
            </View>
            <Button
              label={busy ? "Reserving…" : "Reserve"}
              loading={busy}
              onPress={submit}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
