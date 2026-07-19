import { Pressable, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useOne } from "@refinedev/core";
import { format } from "date-fns";
import { MoreVertical, RefreshCw } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ChildList } from "@/components/refine-ui/child-list";
import { DetailActions } from "@/components/refine-ui/detail-actions";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { CustomerProjectRows } from "@/components/common/customer-project-rows";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { toolCategoryLabel } from "@/components/tool/tool-constants";
import { ToolReservationCalendar } from "@/components/tool/tool-reservation-calendar";
import {
  ActionMenu,
  type ActionMenuOption,
} from "@/components/ui/action-menu";
import { QrCodeButton } from "@/components/qr/qr-code-button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/lib/theme";
import { labelRack } from "@/lib/labels";

interface Tool extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  category?: string;
  status?: string;
  manufacturer?: string;
  serialNumber?: string;
  quantity?: string | number;
  purchaseDate?: string;
  isActive?: boolean;
  toolType?: { name?: string };
  rack?: BaseRecord;
}

function shortDate(v?: string) {
  if (!v) return undefined;
  try {
    return format(new Date(v), "dd MMM yyyy");
  } catch {
    return v;
  }
}

export default function ToolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { query, result } = useOne<Tool>({ resource: "tools", id });
  const t = result;

  const actions: ActionMenuOption[] = [
    // Custody is part of the status change (assignment merged into status).
    {
      label: "Change status",
      icon: RefreshCw,
      onPress: () => router.push(`/tools/${id}/status`),
    },
  ];

  const headerRight = (
    <>
      <QrCodeButton resource="tools" id={id as string} code={t?.code} />
      <ActionMenu
        title="Tool actions"
        options={actions}
        trigger={(open) => (
          <Pressable
            onPress={open}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
          >
            <Icon icon={MoreVertical} color={colors.foreground} />
          </Pressable>
        )}
      />
      <DetailActions
        resource="tools"
        id={id as string}
        name={t?.name ?? "this tool"}
        editRoute={`/tools/${id}/edit`}
      />
    </>
  );

  return (
    <Screen
      title={t?.name ?? "Tool"}
      subtitle={t?.code}
      canGoBack
      headerRight={headerRight}
    >
      {query.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-52 w-full" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Overview</SectionLabel>
              {t?.status ? <StatusBadge label={t.status} /> : null}
            </View>
            <FieldRow label="Code" value={t?.code} mono />
            <FieldRow label="Category" value={toolCategoryLabel(t?.category)} />
            <FieldRow label="Type" value={t?.toolType?.name} />
            <CustomerProjectRows
              customerId={t?.customerId}
              projectId={t?.projectId}
            />
            <FieldRow label="Manufacturer" value={t?.manufacturer} />
            <FieldRow label="Serial" value={t?.serialNumber} mono />
            <FieldRow
              label="Location"
              value={t?.rack ? labelRack(t.rack) : undefined}
            />
            <FieldRow label="Quantity" value={t?.quantity} mono />
            <FieldRow label="Purchased" value={shortDate(t?.purchaseDate)} />
          </View>

          <ChildList
            resource="tool-status-history"
            title="Status history"
            filters={[{ field: "toolId", operator: "eq", value: id }]}
            sorters={[{ field: "createdAt", order: "desc" }]}
            emptyText="No status changes"
            renderItem={(row: BaseRecord) => (
              <View className="flex-row items-center justify-between p-3">
                <View className="flex-1 pr-2">
                  <Text className="text-sm text-foreground">
                    {row.fromStatus ? `${row.fromStatus} → ` : ""}
                    {row.toStatus}
                  </Text>
                  {row.assignedTo ? (
                    <Text className="text-xs text-muted-foreground">
                      👤 {row.assignedTo}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-xs text-muted-foreground">
                  {shortDate(row.createdAt)}
                </Text>
              </View>
            )}
          />

          <ToolReservationCalendar toolId={id as string} />
        </ScrollView>
      )}
    </Screen>
  );
}
