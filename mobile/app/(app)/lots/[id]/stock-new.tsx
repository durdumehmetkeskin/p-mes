import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useList } from "@refinedev/core";
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

function Label({ children }: { children: string }) {
  return (
    <Text className="text-xs font-sans-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </Text>
  );
}

export default function AddStockItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lotId = id as string;
  const router = useRouter();
  const invalidate = useInvalidate();

  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [rackId, setRackId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);

  const { result: warehouses } = useList<BaseRecord>({
    resource: "warehouses",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const { result: racks } = useList<BaseRecord>({
    resource: "racks",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });

  const whOptions: SelectOption[] = (warehouses?.data ?? []).map((w) => ({
    value: String(w.id),
    label: [w.code, w.name].filter(Boolean).join(" · "),
  }));
  const rackOptions: SelectOption[] = (racks?.data ?? []).map((r) => ({
    value: String(r.id),
    label: String(r.code ?? r.id),
  }));

  const submit = () => {
    const qty = Number(quantity);
    if (!warehouseId || !qty || qty <= 0) {
      Alert.alert("Missing", "Warehouse and a positive quantity are required.");
      return;
    }
    setBusy(true);
    axiosInstance
      .post("/stock-items", {
        lotId,
        warehouseId,
        rackId: rackId ?? undefined,
        quantity: qty,
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

  return (
    <Screen title="Add stock item" canGoBack>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="gap-2">
          <Label>Warehouse</Label>
          <SearchableSelect
            value={warehouseId}
            onChange={setWarehouseId}
            options={whOptions}
            placeholder="Select a warehouse"
          />
        </View>
        <View className="gap-2">
          <Label>Rack (optional)</Label>
          <SearchableSelect
            value={rackId}
            onChange={setRackId}
            options={rackOptions}
            placeholder="Select a rack"
            allowClear
          />
        </View>
        <View className="gap-2">
          <Label>Quantity</Label>
          <Input
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
        <Button label={busy ? "Adding…" : "Add"} loading={busy} onPress={submit} />
      </ScrollView>
    </Screen>
  );
}
