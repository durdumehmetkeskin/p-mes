import { Pressable, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useDelete, useOne } from "@refinedev/core";
import { Pencil, Trash2 } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Can } from "@/components/can";
import { QrCodeButton } from "@/components/qr/qr-code-button";
import { confirmDelete } from "@/components/refine-ui/confirm";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/lib/theme";

interface Material extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  dangerWeeks?: number | null;
  warningWeeks?: number | null;
  isActive?: boolean;
  isLotTracked?: boolean;
  isSerialTracked?: boolean;
  description?: string;
  materialType?: { name?: string };
  materialUnit?: { name?: string } | null;
}

function yesNo(v?: boolean) {
  return v ? "Yes" : "No";
}

export default function MaterialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { query, result } = useOne<Material>({ resource: "materials", id });
  const { mutate: deleteMaterial } = useDelete();
  const m = result;

  const headerRight = (
    <>
      <QrCodeButton resource="materials" id={id as string} code={m?.code} />
      <Can resource="materials" action="edit">
        <Pressable
          onPress={() => router.push(`/materials/${id}/edit`)}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
        >
          <Icon icon={Pencil} color={colors.foreground} />
        </Pressable>
      </Can>
      <Can resource="materials" action="delete">
        <Pressable
          onPress={() =>
            confirmDelete(m?.name ?? "this material", () =>
              deleteMaterial(
                { resource: "materials", id: id as string },
                { onSuccess: () => router.back() },
              ),
            )
          }
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
        >
          <Icon icon={Trash2} color={colors.destructive} />
        </Pressable>
      </Can>
    </>
  );

  return (
    <Screen
      title={m?.name ?? "Material"}
      subtitle={m?.code}
      canGoBack
      headerRight={headerRight}
    >
      {query.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Overview</SectionLabel>
              <StatusBadge label={m?.isActive === false ? "inactive" : "active"} />
            </View>
            <FieldRow label="Code" value={m?.code} mono />
            <FieldRow label="Type" value={m?.materialType?.name} />
            <FieldRow label="Unit" value={m?.materialUnit?.name} />
            <FieldRow
              label="Danger threshold"
              value={m?.dangerWeeks != null ? `${m.dangerWeeks} wk` : undefined}
            />
            <FieldRow
              label="Warning threshold"
              value={
                m?.warningWeeks != null ? `${m.warningWeeks} wk` : undefined
              }
            />
          </View>

          <View className="rounded-lg border border-border bg-card p-4">
            <SectionLabel>Tracking</SectionLabel>
            <FieldRow label="Lot tracked" value={yesNo(m?.isLotTracked)} />
            <FieldRow label="Serial tracked" value={yesNo(m?.isSerialTracked)} />
          </View>

          {m?.description ? (
            <View className="rounded-lg border border-border bg-card p-4">
              <SectionLabel>Description</SectionLabel>
              <Text className="text-sm text-foreground">{m.description}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
