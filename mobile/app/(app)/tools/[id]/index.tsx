import { Pressable, ScrollView, Text, View } from "react-native";
import {
  type BaseRecord,
  useInvalidate,
  useList,
  useOne,
} from "@refinedev/core";
import { format } from "date-fns";
import {
  MoreVertical,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Square,
  Undo2,
  UserPlus,
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "sonner-native";

import { ChildList } from "@/components/refine-ui/child-list";
import { confirm } from "@/components/refine-ui/confirm";
import { DetailActions } from "@/components/refine-ui/detail-actions";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { CustomerProjectRows } from "@/components/common/customer-project-rows";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import {
  TOOL_INVALIDATE,
  toolErr,
} from "@/components/tool/tool-actions";
import { toolCategoryLabel } from "@/components/tool/tool-constants";
import { ToolReservationCalendar } from "@/components/tool/tool-reservation-calendar";
import {
  ActionMenu,
  type ActionMenuOption,
} from "@/components/ui/action-menu";
import { QrCodeButton } from "@/components/qr/qr-code-button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";
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
  currentLifeCycle?: string | number;
  maxLifeCycle?: string | number;
  purchaseDate?: string;
  nextMaintenanceDate?: string;
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
  const invalidate = useInvalidate();
  const { query, result } = useOne<Tool>({ resource: "tools", id });
  const t = result;

  const { result: assignRes } = useList({
    resource: "tool-assignments",
    filters: [
      { field: "toolId", operator: "eq", value: id },
      { field: "status", operator: "eq", value: "active" },
    ],
    pagination: { pageSize: 1 },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const hasActiveAssignment = (assignRes?.total ?? 0) > 0;

  const { result: usageRes } = useList({
    resource: "tool-usages",
    filters: [
      { field: "toolId", operator: "eq", value: id },
      { field: "status", operator: "eq", value: "ongoing" },
    ],
    pagination: { pageSize: 1 },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const hasOngoingUsage = (usageRes?.total ?? 0) > 0;

  const resetCycles = () =>
    confirm({
      title: "Reset cycle counter?",
      message: "This sets the tool's current life cycle back to 0.",
      confirmLabel: "Reset",
      onConfirm: async () => {
        try {
          await axiosInstance.post(`/tools/${id}/cycles/reset`, {});
          TOOL_INVALIDATE.forEach((r) =>
            invalidate({ resource: r, invalidates: ["list"] }),
          );
          invalidate({ resource: "tools", invalidates: ["detail"], id });
          toast.success("Cycles reset");
        } catch (e) {
          toast.error(toolErr(e));
        }
      },
    });

  const actions: ActionMenuOption[] = [
    {
      label: "Change status",
      icon: RefreshCw,
      onPress: () => router.push(`/tools/${id}/status`),
    },
    hasActiveAssignment
      ? {
          label: "Return",
          icon: Undo2,
          onPress: () => router.push(`/tools/${id}/return`),
        }
      : {
          label: "Assign",
          icon: UserPlus,
          onPress: () => router.push(`/tools/${id}/assign`),
        },
    hasOngoingUsage
      ? {
          label: "End usage",
          icon: Square,
          onPress: () => router.push(`/tools/${id}/usage-end`),
        }
      : {
          label: "Start usage",
          icon: Play,
          onPress: () => router.push(`/tools/${id}/usage-start`),
        },
    {
      label: "Add cycles",
      icon: Plus,
      onPress: () => router.push(`/tools/${id}/cycles`),
    },
    { label: "Reset cycles", icon: RotateCcw, onPress: resetCycles },
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
            <FieldRow
              label="Cycles"
              value={
                t?.maxLifeCycle
                  ? `${t?.currentLifeCycle ?? 0} / ${t.maxLifeCycle}`
                  : (t?.currentLifeCycle ?? undefined)
              }
              mono
            />
            <FieldRow
              label="Next maintenance"
              value={shortDate(t?.nextMaintenanceDate)}
            />
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
                <Text className="text-sm text-foreground">
                  {row.fromStatus ? `${row.fromStatus} → ` : ""}
                  {row.toStatus}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {shortDate(row.createdAt)}
                </Text>
              </View>
            )}
          />

          <ChildList
            resource="tool-assignments"
            title="Assignments"
            filters={[{ field: "toolId", operator: "eq", value: id }]}
            sorters={[{ field: "createdAt", order: "desc" }]}
            emptyText="No assignments"
            renderItem={(row: BaseRecord) => (
              <View className="flex-row items-center justify-between p-3">
                <View className="flex-1">
                  <Text className="text-sm text-foreground">
                    {row.assignedTo}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {shortDate(row.createdAt)}
                  </Text>
                </View>
                <StatusBadge label={row.status ?? "returned"} />
              </View>
            )}
          />

          <ChildList
            resource="tool-usages"
            title="Usage"
            filters={[{ field: "toolId", operator: "eq", value: id }]}
            sorters={[{ field: "startedAt", order: "desc" }]}
            emptyText="No usage sessions"
            renderItem={(row: BaseRecord) => (
              <View className="flex-row items-center justify-between p-3">
                <View className="flex-1">
                  <Text className="text-sm text-foreground">
                    {row.usedFor ?? "Session"}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {shortDate(row.startedAt)}
                    {row.durationMinutes ? ` · ${row.durationMinutes}m` : ""}
                  </Text>
                </View>
                <StatusBadge label={row.status ?? "completed"} />
              </View>
            )}
          />

          <ChildList
            resource="tool-cycle-logs"
            title="Cycle log"
            filters={[{ field: "toolId", operator: "eq", value: id }]}
            sorters={[{ field: "createdAt", order: "desc" }]}
            emptyText="No cycle entries"
            renderItem={(row: BaseRecord) => (
              <View className="flex-row items-center justify-between p-3">
                <Text className="text-sm text-foreground">
                  {Number(row.cycles) > 0 ? `+${row.cycles}` : row.cycles}{" "}
                  <Text className="text-xs text-muted-foreground">
                    ({row.source})
                  </Text>
                </Text>
                <Text className="font-mono text-sm text-foreground">
                  {row.resultingLifeCycle}
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
