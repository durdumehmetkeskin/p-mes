import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useList, useOne } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";

const REFRESH = ["stock-items", "inventory-balances", "lots"];

interface StockItem extends BaseRecord {
  id: string;
  quantity?: number;
  status?: string;
  warehouseId?: string;
  warehouse?: { code?: string } | null;
  rack?: { code?: string } | null;
  lot?: {
    id?: string;
    lotNumber?: string;
    material?: {
      code?: string;
      name?: string;
      materialUnit?: { name?: string } | null;
    } | null;
  } | null;
  order?: { orderNumber?: string } | null;
  stage?: {
    name?: string;
    status?: string;
    workers?: Array<{ name?: string }>;
  } | null;
}
interface Rack extends BaseRecord {
  id: string;
  code?: string;
  zone?: { warehouseId?: string; warehouse?: { code?: string } | null } | null;
}

export default function StockItemHandoverScreen() {
  const { id, scanned } = useLocalSearchParams<{ id: string; scanned?: string }>();
  const itemId = id as string;
  // Reached via QR scan → the scanner is physically at the material, so the
  // direct Receive (custody) action is unlocked. From a notification/list the
  // user must scan the item's QR first.
  const viaScan = scanned === "1";
  const router = useRouter();
  const invalidate = useInvalidate();
  const [busy, setBusy] = useState(false);

  // Return re-receipt form (warehouse weighs + re-shelves the leftover).
  const [returnQty, setReturnQty] = useState("");
  const [returnRackId, setReturnRackId] = useState<string | null>(null);

  const { query, result } = useOne<StockItem>({
    resource: "stock-items",
    id: itemId,
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const item = result;
  const status = item?.status;

  const { result: racks } = useList<Rack>({
    resource: "racks",
    pagination: { mode: "off" },
    queryOptions: { retry: false, enabled: status === "returning" },
    errorNotification: false,
  });
  // Only racks in this item's warehouse are valid re-shelve targets.
  const rackOptions: SelectOption[] = useMemo(
    () =>
      (racks?.data ?? [])
        .filter((r) => !item?.warehouseId || r.zone?.warehouseId === item.warehouseId)
        .map((r) => ({ value: String(r.id), label: String(r.code ?? r.id) })),
    [racks, item?.warehouseId],
  );

  const done = () => {
    REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
    if (router.canGoBack()) router.back();
  };
  const fail = (err: { response?: { data?: { message?: string | string[] } } }) => {
    const msg = err?.response?.data?.message;
    Alert.alert("Failed", Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error"));
  };

  const run = (verb: "deliver" | "receive" | "return" | "consume-delivered") => {
    setBusy(true);
    axiosInstance
      .post(`/stock-items/${itemId}/${verb}`)
      .then(done)
      .catch(fail)
      .finally(() => setBusy(false));
  };

  const submitReturn = () => {
    const qty = Number(returnQty);
    const max = item?.quantity ?? 0;
    if (!qty || qty <= 0) {
      Alert.alert("Missing", "Enter the weighed quantity.");
      return;
    }
    if (qty > max) {
      Alert.alert(
        "Too much",
        `At most ${max} can be returned (the delivered amount).`,
      );
      return;
    }
    if (!returnRackId) {
      Alert.alert("Missing", "Select the rack to shelve it on.");
      return;
    }
    setBusy(true);
    axiosInstance
      .post(`/stock-items/${itemId}/receive-return`, {
        quantity: qty,
        rackId: returnRackId,
      })
      .then(done)
      .catch(fail)
      .finally(() => setBusy(false));
  };

  const unit = item?.lot?.material?.materialUnit?.name ?? "";

  return (
    <Screen title="Handover" subtitle={item?.lot?.material?.name} canGoBack>
      {query.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-40 w-full" />
        </View>
      ) : !item ? (
        <View className="p-4">
          <Text className="text-sm text-muted-foreground">
            Could not load this stock item.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Stock item</SectionLabel>
              {status ? <StatusBadge label={status} /> : null}
            </View>
            <FieldRow
              label="Material"
              value={
                item.lot?.material
                  ? `${item.lot.material.code ?? ""} · ${item.lot.material.name ?? ""}`
                  : undefined
              }
            />
            <FieldRow label="Lot" value={item.lot?.lotNumber} mono />
            <FieldRow
              label="Location"
              value={
                [item.warehouse?.code, item.rack?.code].filter(Boolean).join(" / ") ||
                undefined
              }
            />
            <FieldRow label="Quantity" value={String(item.quantity ?? 0)} mono />
            <FieldRow label="Order" value={item.order?.orderNumber} />
            <FieldRow label="Stage" value={item.stage?.name} />
            <FieldRow
              label="Teslim alacak"
              value={
                (item.stage?.workers ?? [])
                  .map((w) => w.name)
                  .filter(Boolean)
                  .join(", ") || undefined
              }
            />
          </View>

          {status === "reserved" ? (
            <View className="gap-2">
              {viaScan ? (
                <Button
                  label="Teslim al (zimmetine geçer)"
                  disabled={busy}
                  onPress={() => run("receive")}
                />
              ) : (
                <Button
                  label="Teslim al — QR okut"
                  disabled={busy}
                  onPress={() => router.push("/scan")}
                />
              )}
              <Button
                variant="outline"
                label="Deliver to stage"
                disabled={busy}
                onPress={() => run("deliver")}
              />
            </View>
          ) : status === "delivering" ? (
            viaScan ? (
              <Button
                label="Teslim al (zimmetine geçer)"
                disabled={busy}
                onPress={() => run("receive")}
              />
            ) : (
              <Button
                label="Teslim al — QR okut"
                disabled={busy}
                onPress={() => router.push("/scan")}
              />
            )
          ) : status === "delivered" ? (
            <View className="gap-2">
              <Text className="text-xs text-muted-foreground">
                Aşama tamamlanmadan önce kalan malzemeyi iade edin ya da tamamı
                kullanıldıysa tüketildi olarak işaretleyin.
              </Text>
              <Button
                label="Return leftover to warehouse"
                disabled={busy}
                onPress={() => run("return")}
              />
              <Button
                variant="outline"
                label="Tümü tüketildi"
                disabled={busy}
                onPress={() =>
                  Alert.alert(
                    "Tüketildi olarak işaretle",
                    "Malzemenin tamamı bu aşamada kullanıldı olarak kaydedilecek. Emin misiniz?",
                    [
                      { text: "Vazgeç", style: "cancel" },
                      {
                        text: "Tüketildi",
                        style: "destructive",
                        onPress: () => run("consume-delivered"),
                      },
                    ],
                  )
                }
              />
            </View>
          ) : status === "returning" ? (
            <View className="gap-3 rounded-lg border border-border bg-card p-4">
              <SectionLabel>Re-receive to warehouse</SectionLabel>
              <View className="gap-2">
                <Text className="text-xs font-sans-semibold uppercase tracking-wider text-muted-foreground">
                  Weighed quantity{unit ? ` (${unit})` : ""} · max {item.quantity ?? 0}
                </Text>
                <Input
                  value={returnQty}
                  onChangeText={setReturnQty}
                  keyboardType="numeric"
                  placeholder="0"
                />
                {(() => {
                  const q = Number(returnQty);
                  const max = item.quantity ?? 0;
                  if (!q || q <= 0 || q > max) return null;
                  return (
                    <Text className="text-xs text-muted-foreground">
                      Used at stage: {Math.round((max - q) * 1000) / 1000}
                      {unit ? ` ${unit}` : ""}
                    </Text>
                  );
                })()}
              </View>
              <View className="gap-2">
                <Text className="text-xs font-sans-semibold uppercase tracking-wider text-muted-foreground">
                  Rack
                </Text>
                <SearchableSelect
                  value={returnRackId}
                  onChange={setReturnRackId}
                  options={rackOptions}
                  placeholder="Select a rack"
                />
              </View>
              <Button
                label={busy ? "Saving…" : "Accept return"}
                loading={busy}
                onPress={submitReturn}
              />
            </View>
          ) : (
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                {status === "reserving"
                  ? "Still being prepared by the warehouse."
                  : status === "available"
                    ? "This item is available stock — nothing to hand over."
                    : "No handover action available for this item."}
              </Text>
              {item.lot?.id ? (
                <Text
                  className="text-sm text-primary"
                  onPress={() => router.replace(`/lots/${item.lot?.id}`)}
                >
                  Open lot →
                </Text>
              ) : null}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
