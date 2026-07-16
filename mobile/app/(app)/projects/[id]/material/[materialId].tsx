import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Pencil, X } from "lucide-react-native";

import { Can } from "@/components/can";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

interface StockItemView {
  id: string;
  quantity: number;
  status:
    | "available"
    | "reserving"
    | "reserved"
    | "delivering"
    | "delivered"
    | "returning"
    | "consumed";
  warehouse: string | null;
  rack: string | null;
  order: string | null;
  stage: string | null;
}
interface LotView {
  id: string;
  lotNumber: string;
  expiryDate: string | null;
  status: string;
  stockItems: StockItemView[];
}
interface MovementView {
  id: string;
  type: string;
  quantity: number;
  createdAt: string;
  note: string | null;
  source: string | null;
  target: string | null;
  from: string;
  to: string;
}
interface Detail {
  material: {
    id: string;
    code: string;
    name: string;
    unit: string;
    description: string | null;
  };
  reorderLevel: number | null;
  lots: LotView[];
  movements: MovementView[];
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <View className="border-b border-border p-3">
        <Text className="font-sans-semibold text-sm text-card-foreground">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export default function ProjectMaterialDetailScreen() {
  const { id, materialId } = useLocalSearchParams<{
    id: string;
    materialId: string;
  }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingReorder, setEditingReorder] = useState(false);
  const [reorderInput, setReorderInput] = useState("");
  const [savingReorder, setSavingReorder] = useState(false);

  const fetchDetail = useCallback(() => {
    if (!id || !materialId) return;
    void axiosInstance
      .get<Detail>(`/projects/${id}/materials/${materialId}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id, materialId]);

  useEffect(() => {
    if (!id || !materialId) return;
    setLoading(true);
    fetchDetail();
  }, [id, materialId, fetchDetail]);

  const saveReorder = async () => {
    const value = Number(reorderInput);
    if (Number.isNaN(value) || value < 0) {
      Alert.alert("Reorder", "Enter a valid number (0 clears it).");
      return;
    }
    setSavingReorder(true);
    try {
      await axiosInstance.post("/project-material-reorders", {
        projectId: id,
        materialId,
        reorderLevel: value,
      });
      setEditingReorder(false);
      fetchDetail();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Could not save reorder level";
      Alert.alert("Reorder", msg);
    } finally {
      setSavingReorder(false);
    }
  };

  const unit = data?.material.unit ?? "";
  const items = useMemo(
    () =>
      (data?.lots ?? []).flatMap((l) =>
        l.stockItems.map((si) => ({ ...si, lotNumber: l.lotNumber })),
      ),
    [data],
  );
  const reserved = items.filter(
    (i) => i.status !== "available" && i.status !== "consumed",
  );
  const byRack = useMemo(() => {
    const map = new Map<
      string,
      { rack: string; current: number; reserved: number; available: number }
    >();
    for (const si of items) {
      if (si.status === "consumed") continue;
      const key = si.rack ?? "—";
      const r = map.get(key) ?? {
        rack: key,
        current: 0,
        reserved: 0,
        available: 0,
      };
      r.current += si.quantity;
      if (si.status === "available") r.available += si.quantity;
      else r.reserved += si.quantity;
      map.set(key, r);
    }
    return [...map.values()];
  }, [items]);

  const rowCls = (i: number) =>
    i > 0 ? "border-t border-border p-3" : "p-3";

  return (
    <Screen
      title={data ? data.material.name : "Material"}
      subtitle={data?.material.code}
      canGoBack
    >
      {loading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-40 w-full" />
        </View>
      ) : !data ? (
        <View className="p-4">
          <Text className="text-sm text-muted-foreground">
            Could not load this material.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <SectionLabel>Material</SectionLabel>
            <FieldRow label="Code" value={data.material.code} mono />
            <FieldRow label="Name" value={data.material.name} />
            <FieldRow label="Unit" value={data.material.unit} />
            {data.material.description ? (
              <FieldRow label="Description" value={data.material.description} />
            ) : null}
            <FieldRow label="Reorder level">
              {editingReorder ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={reorderInput}
                    onChangeText={setReorderInput}
                    keyboardType="numeric"
                    autoFocus
                    editable={!savingReorder}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    className="min-w-16 flex-1 rounded-md border border-input px-2 py-1 font-mono text-sm text-foreground"
                  />
                  <Pressable
                    onPress={() => void saveReorder()}
                    disabled={savingReorder}
                    hitSlop={6}
                    className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                  >
                    <Icon icon={Check} size={16} color={colors.success} />
                  </Pressable>
                  <Pressable
                    onPress={() => setEditingReorder(false)}
                    hitSlop={6}
                    className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                  >
                    <Icon icon={X} size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row items-center gap-2">
                  <Text className="font-mono text-sm text-foreground">
                    {data.reorderLevel != null && data.reorderLevel > 0
                      ? `${data.reorderLevel} ${unit}`
                      : "—"}
                  </Text>
                  <Can resource="projects" action="update">
                    <Pressable
                      onPress={() => {
                        setReorderInput(
                          data.reorderLevel != null && data.reorderLevel > 0
                            ? String(data.reorderLevel)
                            : "",
                        );
                        setEditingReorder(true);
                      }}
                      hitSlop={6}
                      className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                    >
                      <Icon
                        icon={Pencil}
                        size={14}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                  </Can>
                </View>
              )}
            </FieldRow>
          </View>

          {/* Stock by rack — this project only */}
          <Card title="Stock by rack">
            {byRack.length === 0 ? (
              <Text className="p-3 text-sm text-muted-foreground">
                No project stock for this material.
              </Text>
            ) : (
              byRack.map((r, i) => (
                <View
                  key={r.rack}
                  className={`${rowCls(i)} flex-row items-center justify-between`}
                >
                  <Text className="text-sm text-foreground">{r.rack}</Text>
                  <Text className="font-mono text-xs text-muted-foreground">
                    {r.available} avail · {r.reserved} rsv
                  </Text>
                </View>
              ))
            )}
          </Card>

          {/* Lots — tap to open the lot (reserve there) */}
          <Card title={`Lots${data.lots.length ? ` (${data.lots.length})` : ""}`}>
            {data.lots.length === 0 ? (
              <Text className="p-3 text-sm text-muted-foreground">
                No lots for this material in this project.
              </Text>
            ) : (
              data.lots.map((l, i) => {
                const onHand = l.stockItems
                  .filter((s) => s.status !== "consumed")
                  .reduce((s, it) => s + it.quantity, 0);
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => router.push(`/lots/${l.id}`)}
                    className={`${rowCls(i)} flex-row items-center justify-between active:bg-accent`}
                  >
                    <View className="flex-1 pr-2">
                      <Text className="font-sans-medium text-sm text-foreground">
                        {l.lotNumber}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {l.expiryDate ?? "—"}
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      <StatusBadge label={String(l.status).replace(/_/g, " ")} />
                      <Text className="font-mono text-xs text-foreground">
                        {onHand} {unit}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Card>

          {/* Reserved stock — this project's lots only */}
          <Card
            title={`Reserved${reserved.length ? ` (${reserved.length})` : ""}`}
          >
            {reserved.length === 0 ? (
              <Text className="p-3 text-sm text-muted-foreground">
                No reserved stock for this project.
              </Text>
            ) : (
              reserved.map((r, i) => (
                <View key={r.id} className={rowCls(i)}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-foreground">
                      {r.lotNumber}
                      <Text className="text-xs text-muted-foreground">
                        {"  "}
                        {r.rack ?? "—"}
                      </Text>
                    </Text>
                    <Text className="font-mono text-sm text-foreground">
                      {r.quantity} {unit}
                    </Text>
                  </View>
                  {r.order ? (
                    <Text className="text-xs text-muted-foreground">
                      {r.order}
                      {r.stage ? ` · ${r.stage}` : ""}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </Card>

          {/* Movements — this project's lots only */}
          <Card title="Stock movements">
            {data.movements.length === 0 ? (
              <Text className="p-3 text-sm text-muted-foreground">
                No movements for this project's lots.
              </Text>
            ) : (
              data.movements.map((m, i) => (
                <View key={m.id} className={rowCls(i)}>
                  <View className="flex-row items-center justify-between">
                    <StatusBadge label={String(m.type).replace(/_/g, " ")} />
                    <Text className="font-mono text-sm text-foreground">
                      {m.quantity}
                    </Text>
                  </View>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {[m.from, m.to].join(" → ")}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}
