import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useList, useOne } from "@refinedev/core";
import { useLocalSearchParams } from "expo-router";

import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";

interface Product extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  quantity?: number;
  handoverStatus?: "produced" | "delivering" | "received";
  materialUnit?: { name?: string } | null;
  stage?: { name?: string } | null;
  order?: { orderNumber?: string } | null;
  storageRack?: {
    code?: string;
    storage?: { code?: string; location?: { name?: string } | null } | null;
  } | null;
  deliveredByUser?: { name?: string } | null;
  receivedByUser?: { name?: string } | null;
}
interface StorageRackRow extends BaseRecord {
  id: string;
  code?: string;
  storage?: { location?: { code?: string; name?: string } | null } | null;
}

/**
 * Product drop-off reached by scanning the product QR — ONE-SIDED: any user
 * picks a location-storage rack and stores the product there (no warehouse
 * responsible in the loop).
 */
export default function ProductHandoverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = id as string;
  const [busy, setBusy] = useState(false);
  const [rackId, setRackId] = useState<string | null>(null);

  const { result: product, query } = useOne<Product>({
    resource: "products",
    id: productId,
    errorNotification: false,
    queryOptions: { retry: false },
  });

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

  const store = () => {
    if (!rackId) return;
    setBusy(true);
    axiosInstance
      .post(`/products/${productId}/store`, { storageRackId: rackId })
      .then(() => query.refetch())
      .catch((err: { response?: { data?: { message?: string | string[] } } }) => {
        const msg = err?.response?.data?.message;
        Alert.alert(
          "Failed",
          Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error"),
        );
      })
      .finally(() => setBusy(false));
  };

  return (
    <Screen title="Product drop-off" subtitle={product?.name} canGoBack>
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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
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
            <FieldRow label="Produced by stage" value={product.stage?.name} />
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
            {product.receivedByUser?.name ? (
              <FieldRow label="Stored by" value={product.receivedByUser.name} />
            ) : null}
          </View>

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
