import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  type BaseRecord,
  useGetIdentity,
  useInvalidate,
  useOne,
} from "@refinedev/core";
import { type FieldValues, useForm } from "react-hook-form";
import { useLocalSearchParams } from "expo-router";
import { toast } from "sonner-native";

import { Can } from "@/components/can";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import {
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { CompletionReportCard } from "@/components/project/completion-report-card";
import { StageDirectives } from "@/components/project/stage-directives";
import { StageReservation } from "@/components/project/stage-reservation";
import { StageStockItems } from "@/components/project/stage-stock-items";
import { StageTools } from "@/components/project/stage-tools";
import { useTeamMembers } from "@/components/project/use-team-members";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";

interface Stage extends BaseRecord {
  id: string;
  name?: string;
  status?: string;
  sequence?: number;
  note?: string;
  directives?: string | null;
  durationHours?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  estimatedStartDate?: string;
  estimatedCompletedDate?: string;
  estimatedDurationHours?: number;
  workers?: Array<{ id: string }>;
}
interface Process extends BaseRecord {
  id: string;
  responsibleUserId?: string | null;
  stages?: Stage[];
  orderItem?: { orderId?: string };
}

export default function StageDetailScreen() {
  const { id, stageId, processId } = useLocalSearchParams<{
    id: string;
    stageId: string;
    processId: string;
  }>();
  const invalidate = useInvalidate();
  const { query, result } = useOne<Process>({
    resource: "processes",
    id: processId,
    queryOptions: { enabled: !!processId, retry: false },
  });
  const process = result;
  const stages = [...(process?.stages ?? [])].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
  );
  const stage = stages.find((s) => s.id === stageId);

  const firstIncomplete = stages.findIndex((s) => s.status !== "completed");
  const currentIndex = firstIncomplete === -1 ? stages.length : firstIncomplete;
  const myIndex = stages.findIndex((s) => s.id === stageId);
  const unlocked = myIndex <= currentIndex;

  const { members } = useTeamMembers(id);
  const { has } = usePermissions();
  const isAdmin = useIsAdmin();
  const { data: identity } = useGetIdentity<{ id: string }>();
  // Status rights (backend mirrors): admin/process responsible = every
  // transition; a stage worker = start + complete on their own stage only.
  const canStatusAll =
    isAdmin || (!!identity?.id && identity.id === process?.responsibleUserId);
  const canStatusWorker =
    !!identity?.id && (stage?.workers ?? []).some((w) => w.id === identity.id);
  // Stage date window (actuals win over estimates) — reservations live inside.
  const windowStart =
    stage?.startedAt?.slice(0, 10) ?? stage?.estimatedStartDate ?? null;
  const windowEnd =
    stage?.completedAt?.slice(0, 10) ?? stage?.estimatedCompletedDate ?? null;
  const memberOptions = members.map((m) => ({
    label: m.name ?? m.id,
    value: m.id,
  }));

  const [savingInfo, setSavingInfo] = useState(false);
  const { control, handleSubmit } = useForm<FieldValues>({
    values: {
      name: stage?.name ?? "",
      durationHours: stage?.durationHours,
      note: stage?.note ?? "",
      estimatedStartDate: stage?.estimatedStartDate ?? "",
      estimatedCompletedDate: stage?.estimatedCompletedDate ?? "",
      estimatedDurationHours: stage?.estimatedDurationHours,
    },
  });

  const refetch = () => {
    invalidate({ resource: "processes", invalidates: ["detail"], id: processId });
    invalidate({ resource: "processes", invalidates: ["list"] });
  };

  const changeStatus = async (status: string) => {
    try {
      await axiosInstance.patch(`/process-stages/${stageId}/status`, { status });
      refetch();
      toast.success("Status updated");
    } catch {
      toast.error("Could not change status");
    }
  };

  const saveInfo = handleSubmit(async (v) => {
    setSavingInfo(true);
    try {
      await axiosInstance.patch(`/process-stages/${stageId}`, {
        name: v.name,
        note: v.note || undefined,
        durationHours:
          typeof v.durationHours === "number" ? v.durationHours : undefined,
        estimatedStartDate: v.estimatedStartDate || undefined,
        estimatedCompletedDate: v.estimatedCompletedDate || undefined,
        estimatedDurationHours:
          typeof v.estimatedDurationHours === "number"
            ? v.estimatedDurationHours
            : undefined,
      });
      refetch();
      toast.success("Stage saved");
    } catch {
      toast.error("Could not save stage");
    } finally {
      setSavingInfo(false);
    }
  });

  const status = stage?.status ?? "pending";

  return (
    <Screen title={stage?.name ?? "Stage"} canGoBack>
      {query.isLoading ? (
        <View className="p-4">
          <Skeleton className="h-40 w-full" />
        </View>
      ) : !stage ? (
        <View className="p-6">
          <Text className="text-sm text-muted-foreground">Stage not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <SectionLabel>Status</SectionLabel>
              <StatusBadge label={status} />
            </View>
            {canStatusAll || canStatusWorker ? (
              <View className="flex-row flex-wrap gap-2">
                {status === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      label="Start"
                      disabled={!unlocked}
                      onPress={() => changeStatus("in_progress")}
                    />
                    {/* pending→completed shortcut skips the worker's own
                        start — responsible/admin only (backend 403s). */}
                    {canStatusAll ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        label="Mark complete"
                        disabled={!unlocked}
                        onPress={() => changeStatus("completed")}
                      />
                    ) : null}
                  </>
                ) : null}
                {status === "in_progress" ? (
                  <>
                    <Button
                      size="sm"
                      label="Mark complete"
                      onPress={() => changeStatus("completed")}
                    />
                    {canStatusAll ? (
                      <Button
                        size="sm"
                        variant="outline"
                        label="Reset"
                        onPress={() => changeStatus("pending")}
                      />
                    ) : null}
                  </>
                ) : null}
                {status === "completed" && canStatusAll ? (
                  <Button
                    size="sm"
                    variant="outline"
                    label="Reopen"
                    onPress={() => changeStatus("in_progress")}
                  />
                ) : null}
              </View>
            ) : null}
          </View>

          {unlocked ? (
            <View className="rounded-lg border border-border bg-card p-4">
              <SectionLabel>Details</SectionLabel>
              <View className="mt-2 gap-4">
                <TextField control={control} name="name" label="Name" />
                <NumberField
                  control={control}
                  name="durationHours"
                  label="Duration (h)"
                />
                <TextAreaField control={control} name="note" label="Note" />
                <TextField
                  control={control}
                  name="estimatedStartDate"
                  label="Est. start"
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
                <TextField
                  control={control}
                  name="estimatedCompletedDate"
                  label="Est. completion"
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
                <NumberField
                  control={control}
                  name="estimatedDurationHours"
                  label="Est. duration (h)"
                />
                <Can resource="process-stages" action="update">
                  <Button label="Save stage" loading={savingInfo} onPress={saveInfo} />
                </Can>
              </View>
            </View>
          ) : (
            <View className="rounded-lg border border-border bg-card p-4">
              <FieldRow label="Note" value={stage.note} />
              <Text className="mt-2 text-xs text-muted-foreground">
                Complete earlier stages to edit this one.
              </Text>
            </View>
          )}

          <StageDirectives
            stageId={stageId as string}
            directives={stage.directives}
            canEdit={canStatusAll}
            onChanged={refetch}
          />

          {status === "completed" ? (
            <CompletionReportCard
              endpoint={`/process-stages/${stageId}/completion-report`}
              editable={has("process-stages:update")}
            />
          ) : null}

          <StageStockItems
            stageId={stageId as string}
            orderId={process?.orderItem?.orderId}
            canAssign={canStatusAll}
          />

          <StageTools
            stageId={stageId as string}
            stageCompleted={status === "completed"}
            windowStart={windowStart}
            windowEnd={windowEnd}
          />

          <AttachmentsPanel ownerType="stage" ownerId={stageId as string} />

          <Can resource="section-reservations" action="create">
            <StageReservation
              stageId={stageId as string}
              orderId={process?.orderItem?.orderId}
              windowStart={windowStart}
              windowEnd={windowEnd}
              onChanged={refetch}
            />
          </Can>
        </ScrollView>
      )}
    </Screen>
  );
}
