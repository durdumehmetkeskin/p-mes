import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useOne } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PackagePlus } from "lucide-react-native";

import { QrCodeButton } from "@/components/qr/qr-code-button";
import { ChildList } from "@/components/refine-ui/child-list";
import { DetailActions } from "@/components/refine-ui/detail-actions";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { colors } from "@/lib/theme";

interface Lot extends BaseRecord {
  id: string;
  lotNumber?: string;
  expiryDate?: string;
  status?: string;
  projectId?: string | null;
  material?: { code?: string; name?: string } | null;
  customer?: { name?: string } | null;
  project?: { code?: string; name?: string } | null;
}
interface StockItem extends BaseRecord {
  id: string;
  quantity?: number;
  status?:
    | "available"
    | "reserving"
    | "reserved"
    | "delivering"
    | "delivered"
    | "returning"
    | "consumed";
  warehouse?: { code?: string } | null;
  rack?: { code?: string } | null;
  order?: { orderNumber?: string } | null;
  stage?: { name?: string } | null;
}

const REFRESH = ["stock-items", "inventory-balances", "lots"];

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lotId = id as string;
  const router = useRouter();
  const invalidate = useInvalidate();
  const { query, result } = useOne<Lot>({ resource: "lots", id: lotId });
  const lot = result;
  const isAdmin = useIsAdmin();

  const act = (
    itemId: string,
    verb:
      | "release"
      | "consume"
      | "confirm-reserve"
      | "deliver"
      | "receive"
      | "return",
  ) => {
    const run = () =>
      axiosInstance
        .post(`/stock-items/${itemId}/${verb}`)
        .then(() => {
          REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
        })
        .catch((err: { response?: { data?: { message?: string | string[] } } }) => {
          const msg = err?.response?.data?.message;
          Alert.alert("Failed", Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error"));
        });
    const metas = {
      release: { title: "Release reservation", body: "Return this to available?", cta: "Release", style: "destructive" as const },
      consume: { title: "Consume stock item", body: "Issue this stock out?", cta: "Consume", style: "destructive" as const },
      "confirm-reserve": { title: "Confirm reservation", body: "Mark this prepared and reserved?", cta: "Confirm", style: "default" as const },
      deliver: { title: "Deliver to stage", body: "Hand this over to the stage?", cta: "Deliver", style: "default" as const },
      receive: { title: "Receive", body: "Confirm you received this item?", cta: "Receive", style: "default" as const },
      return: { title: "Return leftover", body: "Send the leftover back to the warehouse?", cta: "Return", style: "default" as const },
    };
    const meta = metas[verb];
    Alert.alert(meta.title, meta.body, [
      { text: "Cancel", style: "cancel" },
      { text: meta.cta, style: meta.style, onPress: () => void run() },
    ]);
  };

  return (
    <Screen
      title={lot ? `Lot ${lot.lotNumber}` : "Lot"}
      subtitle={lot?.material ? `${lot.material.code ?? ""} · ${lot.material.name ?? ""}` : undefined}
      canGoBack
      headerRight={
        <DetailActions
          resource="lots"
          id={lotId}
          name={lot?.lotNumber ?? "this lot"}
          editRoute={`/lots/${lotId}/edit`}
        />
      }
    >
      {query.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-40 w-full" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Lot</SectionLabel>
              {lot?.status ? <StatusBadge label={lot.status} /> : null}
            </View>
            <FieldRow
              label="Material"
              value={lot?.material ? `${lot.material.code ?? ""} · ${lot.material.name ?? ""}` : undefined}
            />
            <FieldRow label="Expiry (SKT)" value={lot?.expiryDate} />
            <FieldRow label="Customer" value={lot?.customer?.name} />
            <FieldRow
              label="Project"
              value={lot?.project ? [lot.project.code, lot.project.name].filter(Boolean).join(" · ") : undefined}
            />
          </View>

          <Button
            variant="outline"
            label="Add stock item"
            leftIcon={<Icon icon={PackagePlus} size={16} color={colors.foreground} />}
            onPress={() => router.push(`/lots/${lotId}/stock-new`)}
          />

          <ChildList<StockItem>
            resource="stock-items"
            title="Stock items"
            filters={[{ field: "lotId", operator: "eq", value: lotId }]}
            emptyText="No stock items yet"
            renderItem={(it) => (
              <View className="gap-2 p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans-semibold text-sm text-foreground">
                    {it.quantity ?? 0}
                    <Text className="font-sans text-xs text-muted-foreground">
                      {"  "}
                      {[it.warehouse?.code, it.rack?.code].filter(Boolean).join(" / ") || "—"}
                    </Text>
                  </Text>
                  <View className="flex-row items-center gap-1">
                    {it.status ? (
                      <StatusBadge
                        label={it.status}
                        tone={it.status === "available" || it.status === "delivered" ? "success" : it.status === "reserving" || it.status === "delivering" ? "info" : it.status === "reserved" || it.status === "returning" ? "warning" : "neutral"}
                      />
                    ) : null}
                    <QrCodeButton
                      resource="stock-items"
                      id={it.id}
                      code={lot?.lotNumber}
                    />
                  </View>
                </View>
                {it.order?.orderNumber ? (
                  <Text className="text-xs text-muted-foreground">
                    {it.order.orderNumber}
                    {it.stage?.name ? ` · ${it.stage.name}` : ""}
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap gap-2">
                  {it.status === "available" ? (
                    <Pressable
                      onPress={() => router.push(`/lots/${lotId}/reserve?itemId=${it.id}`)}
                      className="rounded-md border border-input px-3 py-1.5 active:bg-accent"
                    >
                      <Text className="text-xs text-foreground">Reserve</Text>
                    </Pressable>
                  ) : null}
                  {it.status === "reserving" ? (
                    <Pressable
                      onPress={() => act(it.id, "confirm-reserve")}
                      className="rounded-md border border-primary bg-primary px-3 py-1.5 active:opacity-80"
                    >
                      <Text className="text-xs text-primary-foreground">Confirm</Text>
                    </Pressable>
                  ) : null}
                  {/* Physical handover steps are QR-only; admins may use buttons. */}
                  {isAdmin && it.status === "reserved" ? (
                    <Pressable
                      onPress={() => act(it.id, "deliver")}
                      className="rounded-md border border-primary bg-primary px-3 py-1.5 active:opacity-80"
                    >
                      <Text className="text-xs text-primary-foreground">Deliver</Text>
                    </Pressable>
                  ) : null}
                  {isAdmin && it.status === "delivering" ? (
                    <Pressable
                      onPress={() => act(it.id, "receive")}
                      className="rounded-md border border-primary bg-primary px-3 py-1.5 active:opacity-80"
                    >
                      <Text className="text-xs text-primary-foreground">Receive</Text>
                    </Pressable>
                  ) : null}
                  {isAdmin && it.status === "delivered" ? (
                    <Pressable
                      onPress={() => act(it.id, "return")}
                      className="rounded-md border border-primary bg-primary px-3 py-1.5 active:opacity-80"
                    >
                      <Text className="text-xs text-primary-foreground">Return</Text>
                    </Pressable>
                  ) : null}
                  {isAdmin && it.status === "returning" ? (
                    <Pressable
                      onPress={() => router.push(`/stock-items/${it.id}/handover`)}
                      className="rounded-md border border-primary bg-primary px-3 py-1.5 active:opacity-80"
                    >
                      <Text className="text-xs text-primary-foreground">
                        Receive return
                      </Text>
                    </Pressable>
                  ) : null}
                  {!isAdmin &&
                  (it.status === "reserved" ||
                    it.status === "delivering" ||
                    it.status === "delivered" ||
                    it.status === "returning") ? (
                    <Text className="self-center text-xs text-muted-foreground">
                      Scan QR to hand over
                    </Text>
                  ) : null}
                  {(it.status === "reserving" || it.status === "reserved") ? (
                    <Pressable
                      onPress={() => act(it.id, "release")}
                      className="rounded-md px-3 py-1.5 active:bg-accent"
                    >
                      <Text className="text-xs text-foreground">
                        {it.status === "reserving" ? "Cancel" : "Release"}
                      </Text>
                    </Pressable>
                  ) : null}
                  {(it.status === "available" ||
                    it.status === "reserved" ||
                    it.status === "delivered") ? (
                    <Pressable
                      onPress={() => act(it.id, "consume")}
                      className="rounded-md border border-input px-3 py-1.5 active:bg-accent"
                    >
                      <Text className="text-xs text-foreground">Consume</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
