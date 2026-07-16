import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  type BaseRecord,
  useDelete,
  useList,
  useOne,
} from "@refinedev/core";
import { Activity, Pencil, Plus, Trash2 } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert } from "react-native";

import { Can } from "@/components/can";
import { confirm, confirmDelete } from "@/components/refine-ui/confirm";
import { DetailActions } from "@/components/refine-ui/detail-actions";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { TelemetryPanel } from "@/components/location/telemetry-panel";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

interface Location extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

interface Section extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  isActive?: boolean;
}

interface Reservation extends BaseRecord {
  id: string;
  startDate?: string;
  endDate?: string;
  note?: string;
  section?: { code?: string; name?: string };
  order?: { orderNumber?: string };
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <View className="flex-row items-center justify-between border-b border-border p-3">
        <Text className="font-sans-semibold text-sm text-card-foreground">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { query, result } = useOne<Location>({ resource: "locations", id });
  const l = result;

  const { result: sectionsRes } = useList<Section>({
    resource: "sections",
    filters: [{ field: "locationId", operator: "eq", value: id }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const sections = sectionsRes?.data ?? [];

  const { result: resvRes } = useList<Reservation>({
    resource: "section-reservations",
    filters: [{ field: "locationId", operator: "eq", value: id }],
    sorters: [{ field: "startDate", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const reservations = resvRes?.data ?? [];

  const { mutate: deleteSection } = useDelete();
  const { mutate: deleteReservation } = useDelete();

  const showConditions = async (rid: string) => {
    try {
      const { data } = await axiosInstance.get(
        `/section-reservations/${rid}/conditions`,
      );
      const s = data?.summary;
      Alert.alert(
        "Production conditions",
        s
          ? `Readings: ${s.count}\nTemp: ${s.tempMin}–${s.tempMax} (avg ${s.tempAvg})\nHumidity: ${s.humidityMin}–${s.humidityMax} (avg ${s.humidityAvg})`
          : "No condition data.",
      );
    } catch {
      Alert.alert("Production conditions", "Could not load conditions.");
    }
  };

  return (
    <Screen
      title={l?.name ?? "Location"}
      subtitle={l?.code}
      canGoBack
      headerRight={
        <DetailActions
          resource="locations"
          id={id as string}
          name={l?.name ?? "this location"}
          editRoute={`/locations/${id}/edit`}
        />
      }
    >
      {query.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Overview</SectionLabel>
              <StatusBadge label={l?.isActive === false ? "inactive" : "active"} />
            </View>
            <FieldRow label="Code" value={l?.code} mono />
            {l?.description ? (
              <FieldRow label="Description" value={l.description} />
            ) : null}
          </View>

          <Card
            title={`Sections${sections.length ? ` (${sections.length})` : ""}`}
            action={
              <Can resource="sections" action="create">
                <Pressable
                  onPress={() => router.push(`/locations/${id}/section-new`)}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                >
                  <Icon icon={Plus} size={18} color={colors.foreground} />
                </Pressable>
              </Can>
            }
          >
            {sections.length === 0 ? (
              <Text className="p-3 text-sm text-muted-foreground">No sections</Text>
            ) : (
              sections.map((s, i) => (
                <View
                  key={s.id}
                  className={
                    i > 0
                      ? "flex-row items-center justify-between border-t border-border p-3"
                      : "flex-row items-center justify-between p-3"
                  }
                >
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">{s.name}</Text>
                    <Text className="font-mono text-xs text-muted-foreground">
                      {s.code}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Can resource="sections" action="edit">
                      <Pressable
                        onPress={() =>
                          router.push(
                            `/locations/${id}/section-new?sectionId=${s.id}`,
                          )
                        }
                        hitSlop={6}
                        className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                      >
                        <Icon icon={Pencil} size={16} color={colors.mutedForeground} />
                      </Pressable>
                    </Can>
                    <Can resource="sections" action="delete">
                      <Pressable
                        onPress={() =>
                          confirmDelete(s.name ?? s.code ?? "section", () =>
                            deleteSection({ resource: "sections", id: s.id }),
                          )
                        }
                        hitSlop={6}
                        className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                      >
                        <Icon icon={Trash2} size={16} color={colors.destructive} />
                      </Pressable>
                    </Can>
                  </View>
                </View>
              ))
            )}
          </Card>

          <Card
            title={`Reservations${reservations.length ? ` (${reservations.length})` : ""}`}
          >
            {reservations.length === 0 ? (
              <Text className="p-3 text-sm text-muted-foreground">
                No reservations
              </Text>
            ) : (
              reservations.map((r, i) => (
                <View
                  key={r.id}
                  className={
                    i > 0
                      ? "flex-row items-center justify-between border-t border-border p-3"
                      : "flex-row items-center justify-between p-3"
                  }
                >
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      {r.section?.code ?? "—"}
                      {r.order?.orderNumber ? ` · ${r.order.orderNumber}` : ""}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {r.startDate} → {r.endDate}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Pressable
                      onPress={() => showConditions(r.id)}
                      hitSlop={6}
                      className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                    >
                      <Icon icon={Activity} size={16} color={colors.mutedForeground} />
                    </Pressable>
                    <Can resource="section-reservations" action="delete">
                      <Pressable
                        onPress={() =>
                          confirm({
                            title: "Delete reservation?",
                            confirmLabel: "Delete",
                            destructive: true,
                            onConfirm: () =>
                              deleteReservation({
                                resource: "section-reservations",
                                id: r.id,
                              }),
                          })
                        }
                        hitSlop={6}
                        className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                      >
                        <Icon icon={Trash2} size={16} color={colors.destructive} />
                      </Pressable>
                    </Can>
                  </View>
                </View>
              ))
            )}
          </Card>

          <TelemetryPanel locationId={id as string} />
        </ScrollView>
      )}
    </Screen>
  );
}
