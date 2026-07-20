import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import {
  type BaseRecord,
  useGetIdentity,
  useInvalidate,
  useOne,
} from "@refinedev/core";
import { type FieldValues, useForm } from "react-hook-form";
import { useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "sonner-native";

import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import {
  CheckboxGroupField,
  NumberField,
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
import { colors } from "@/lib/theme";

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
  workers?: Array<{ id: string; name?: string }>;
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
  const router = useRouter();
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
  // Worker candidates = project team, plus any already-assigned worker who has
  // since left the team (so they stay visible and can be unchecked).
  const workerOptions = [
    ...members.map((m) => ({ label: m.name ?? m.id, value: m.id })),
    ...(stage?.workers ?? [])
      .filter((w) => !members.some((m) => m.id === w.id))
      .map((w) => ({ label: w.name ?? w.id, value: w.id })),
  ];

  const [savingInfo, setSavingInfo] = useState(false);
  const { control, handleSubmit } = useForm<FieldValues>({
    values: {
      name: stage?.name ?? "",
      durationHours: stage?.durationHours,
      note: stage?.note ?? "",
      estimatedStartDate: stage?.estimatedStartDate ?? "",
      estimatedCompletedDate: stage?.estimatedCompletedDate ?? "",
      estimatedDurationHours: stage?.estimatedDurationHours,
      workerIds: (stage?.workers ?? []).map((w) => w.id),
    },
  });

  const refetch = () => {
    invalidate({ resource: "processes", invalidates: ["detail"], id: processId });
    invalidate({ resource: "processes", invalidates: ["list"] });
  };

  // Completing REQUIRES a manually entered duration (backend rejects
  // otherwise) — the Completed buttons open this inline prompt first.
  const [completeOpen, setCompleteOpen] = useState(false);
  const [durationInput, setDurationInput] = useState("");
  const openComplete = () => {
    setDurationInput(
      stage?.durationHours != null ? String(stage.durationHours) : "",
    );
    setCompleteOpen(true);
  };
  const confirmComplete = () => {
    const hours = Number(durationInput);
    if (!Number.isFinite(hours) || hours <= 0) return;
    setCompleteOpen(false);
    void changeStatus("completed", { durationHours: hours });
  };

  const changeStatus = async (
    status: string,
    extra?: Record<string, unknown>,
  ) => {
    try {
      await axiosInstance.patch(`/process-stages/${stageId}/status`, {
        status,
        ...(extra ?? {}),
      });
      refetch();
      toast.success("Status updated");
      // Prompt to record what the stage produced (mirrors the web
      // stage-completion StageProductDialog; the screen is skippable).
      // Tool/material return is enforced BEFORE completion by the backend.
      if (status === "completed" && has("products:create")) {
        router.push(`/products/new?stageId=${stageId}&prompted=1`);
      }
    } catch (err) {
      // Surface the backend gate messages (teslim alınmadı / iade edilmeli…).
      const msg = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      toast.error(
        Array.isArray(msg) ? msg.join(", ") : (msg ?? "Could not change status"),
      );
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
        workerIds: Array.isArray(v.workerIds) ? v.workerIds : undefined,
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
            <View className="mb-3 flex-row items-center justify-end">
              <StatusBadge label={status} />
            </View>
            {canStatusAll || canStatusWorker ? (
              <View className="gap-2">
                {/* The work actions are big full-width buttons. */}
                {status === "pending" ? (
                  <Button
                    size="lg"
                    label="Start"
                    disabled={!unlocked}
                    onPress={() => changeStatus("in_progress")}
                  />
                ) : null}
                {status === "in_progress" ? (
                  <Button size="lg" label="Completed" onPress={openComplete} />
                ) : null}
                {completeOpen ? (
                  <View className="gap-2 rounded-md border border-border bg-muted/30 p-2">
                    <Text className="text-xs text-muted-foreground">
                      Çalışma süresi (saat)
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                        keyboardType="decimal-pad"
                        placeholder="örn. 2.5"
                        placeholderTextColor={colors.mutedForeground}
                        value={durationInput}
                        onChangeText={setDurationInput}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        label="Completed"
                        disabled={!(Number(durationInput) > 0)}
                        onPress={confirmComplete}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        label="Cancel"
                        onPress={() => setCompleteOpen(false)}
                      />
                    </View>
                  </View>
                ) : null}
                {/* Secondary transitions — responsible/admin only. */}
                <View className="flex-row flex-wrap gap-2">
                  {/* pending→completed shortcut skips the worker's own
                      start — responsible/admin only (backend 403s). */}
                  {status === "pending" && canStatusAll ? (
                    <Button
                      size="sm"
                      variant="outline"
                      label="Completed"
                      disabled={!unlocked}
                      onPress={openComplete}
                    />
                  ) : null}
                  {status === "in_progress" && canStatusAll ? (
                    <Button
                      size="sm"
                      variant="outline"
                      label="Reset"
                      onPress={() => changeStatus("pending")}
                    />
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
              </View>
            ) : null}
          </View>

          {/* Stage info is editable ONLY by the process responsible / admin
              (PATCH is relationship-authorized). Workers get a read-only view —
              they may only start/complete and record outputs. */}
          {unlocked && canStatusAll ? (
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
                <CheckboxGroupField
                  control={control}
                  name="workerIds"
                  label="Workers (team)"
                  hint={
                    workerOptions.length === 0
                      ? "Önce proje ekibine kullanıcı ekleyin."
                      : undefined
                  }
                  options={workerOptions}
                />
                <Button label="Save stage" loading={savingInfo} onPress={saveInfo} />
              </View>
            </View>
          ) : (
            <View className="rounded-lg border border-border bg-card p-4">
              <SectionLabel>Details</SectionLabel>
              <View className="mt-2">
                <FieldRow label="Name" value={stage.name} />
                <FieldRow
                  label="Duration (h)"
                  value={
                    stage.durationHours != null
                      ? String(stage.durationHours)
                      : undefined
                  }
                />
                <FieldRow label="Note" value={stage.note} />
                <FieldRow label="Est. start" value={stage.estimatedStartDate} />
                <FieldRow
                  label="Est. completion"
                  value={stage.estimatedCompletedDate}
                />
                <FieldRow
                  label="Est. duration (h)"
                  value={
                    stage.estimatedDurationHours != null
                      ? String(stage.estimatedDurationHours)
                      : undefined
                  }
                />
                <FieldRow
                  label="Workers"
                  value={
                    (stage.workers ?? [])
                      .map((w) => w.name ?? w.id)
                      .join(", ") || undefined
                  }
                />
              </View>
              {!unlocked && canStatusAll ? (
                <Text className="mt-2 text-xs text-muted-foreground">
                  Complete earlier stages to edit this one.
                </Text>
              ) : null}
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
              // Backend: stage workers, process responsible or admin.
              editable={canStatusAll || canStatusWorker}
            />
          ) : null}

          <StageStockItems
            stageId={stageId as string}
            orderId={process?.orderItem?.orderId}
            canAssign={canStatusAll}
          />

          <StageTools
            canManage={canStatusAll}
            stageId={stageId as string}
            stageCompleted={status === "completed"}
            windowStart={windowStart}
            windowEnd={windowEnd}
          />

          {/* Generic stage documents — managed by the process responsible /
              admin. Workers record their deliverables as OUTPUT documents. */}
          <AttachmentsPanel
            ownerType="stage"
            ownerId={stageId as string}
            title="Documents"
            canUpload={canStatusAll && has("attachments:create")}
          />

          {/* Output documents — the stage's workers (plus responsible/admin)
              upload what the stage produced (backend mirrors with a 403). */}
          <AttachmentsPanel
            ownerType="stage_output"
            ownerId={stageId as string}
            title="Output documents"
            canUpload={(canStatusAll || canStatusWorker) && has("attachments:create")}
          />

          {(canStatusAll || has("section-reservations:create")) && (
            <StageReservation
              canManage={canStatusAll}
              stageId={stageId as string}
              orderId={process?.orderItem?.orderId}
              windowStart={windowStart}
              windowEnd={windowEnd}
              onChanged={refetch}
            />
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
