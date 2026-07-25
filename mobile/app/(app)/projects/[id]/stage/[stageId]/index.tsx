import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import {
  type BaseRecord,
  useGetIdentity,
  useInvalidate,
  useOne,
} from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "sonner-native";

import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { CompletionReportCard } from "@/components/project/completion-report-card";
import { StageDirectives } from "@/components/project/stage-directives";
import { StageInputs } from "@/components/project/stage-inputs";
import { StageReservation } from "@/components/project/stage-reservation";
import { StageStockItems } from "@/components/project/stage-stock-items";
import { StageTools } from "@/components/project/stage-tools";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";
import { stageUnlocked } from "@/lib/stage-lock";

interface Stage extends BaseRecord {
  id: string;
  name?: string;
  status?: string;
  sequence?: number;
  incomingLinks?: Array<{ fromStageId: string; kind?: "sequence" | "io" }>;
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

  // DAG lock rule shared with web — gates Start/Complete only; the process
  // responsible may EDIT a locked (pending) stage's info regardless.
  const myIndex = stages.findIndex((s) => s.id === stageId);
  const unlocked = stageUnlocked(stages, myIndex);

  // Stages whose OUT port feeds this stage's IN port — their output products
  // and documents flow in as this stage's inputs (web parity).
  const ioPredecessors = (stage?.incomingLinks ?? [])
    .filter((l) => l.kind === "io")
    .map((l) => ({
      id: l.fromStageId,
      name:
        stages.find((s) => s.id === l.fromStageId)?.name ?? "connected stage",
    }));

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
        // Keyboard-aware: the reservation panels have time/search inputs near
        // the bottom — the page must extend by the keyboard height and stay
        // scrollable so the hint texts and Reserve buttons remain reachable.
        <KeyboardAwareScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
        >
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
                {!unlocked ? (
                  <Text className="text-xs text-muted-foreground">
                    Locked — complete the prerequisite stages first.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Stage info is VIEW-ONLY here (web parity) — editing happens on
              the separate Edit screen, available only to the process
              responsible / admin (PATCH is relationship-authorized). */}
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="flex-row items-center justify-between">
              <SectionLabel>Details</SectionLabel>
              {canStatusAll ? (
                <Button
                  size="sm"
                  variant="outline"
                  label="Edit"
                  onPress={() =>
                    router.push(
                      `/projects/${id}/stage/${stageId}/edit?processId=${processId}`,
                    )
                  }
                />
              ) : null}
            </View>
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
          </View>

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

          {/* Inputs: input products (worker pickup gates the start) + input
              documents, including ones flowing in from connected stages. */}
          <StageInputs
            stageId={stageId as string}
            orderId={process?.orderItem?.orderId}
            ioPredecessors={ioPredecessors}
            canEdit={canStatusAll}
            canReceive={canStatusAll || canStatusWorker}
          />

          <StageStockItems
            stageId={stageId as string}
            orderId={process?.orderItem?.orderId}
            canAssign={canStatusAll}
            canHandle={canStatusAll || canStatusWorker}
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
        </KeyboardAwareScrollView>
      )}
    </Screen>
  );
}
