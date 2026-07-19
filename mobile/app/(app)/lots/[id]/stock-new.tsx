import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useOne } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/refine-ui/screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { axiosInstance } from "@/providers/axios";

const REFRESH = ["stock-items", "inventory-balances", "lots"];

interface LotRecord extends BaseRecord {
  id: string;
  rackId?: string | null;
  rack?: {
    code?: string;
    name?: string | null;
    zone?: {
      code?: string;
      warehouse?: { code?: string; name?: string } | null;
    } | null;
  } | null;
}

function Label({ children }: { children: string }) {
  return (
    <Text className="text-xs font-sans-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </Text>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      <View className="rounded-md border border-border bg-muted/40 px-3 py-2">
        <Text className="text-sm text-foreground">{value}</Text>
      </View>
    </View>
  );
}

/**
 * Add stock to a lot. Placement is NOT chosen here — the item always goes
 * onto the lot's rack (backend enforces it too).
 */
export default function AddStockItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lotId = id as string;
  const router = useRouter();
  const invalidate = useInvalidate();

  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);

  const { result: lot } = useOne<LotRecord>({ resource: "lots", id: lotId });
  const rack = lot?.rack ?? null;
  const warehouse = rack?.zone?.warehouse ?? null;

  const submit = () => {
    const qty = Number(quantity);
    if (!rack || !qty || qty <= 0) {
      Alert.alert("Missing", "A positive quantity is required.");
      return;
    }
    setBusy(true);
    // Placement (warehouse + rack) is derived from the lot server-side.
    axiosInstance
      .post("/stock-items", { lotId, quantity: qty })
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
        {rack ? (
          <>
            <ReadOnlyRow
              label="Warehouse"
              value={
                warehouse
                  ? [warehouse.code, warehouse.name].filter(Boolean).join(" · ")
                  : "—"
              }
            />
            <ReadOnlyRow
              label="Rack"
              value={[
                [warehouse?.code, rack.zone?.code].filter(Boolean).join(" / "),
                [rack.code, rack.name].filter(Boolean).join(" · "),
              ]
                .filter(Boolean)
                .join(" / ")}
            />
            <Text className="text-xs text-muted-foreground">
              Stok her zaman lotun rafına konur; depo/raf değiştirilemez.
            </Text>
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
          </>
        ) : (
          <Text className="text-sm text-warning">
            Bu lota raf atanmamış — stok eklemeden önce lotu düzenleyip raf
            atayın.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}
