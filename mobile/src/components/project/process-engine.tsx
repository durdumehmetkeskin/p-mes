import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  type BaseRecord,
  useGetIdentity,
  useInvalidate,
  useList,
} from "@refinedev/core";
import { ArrowUpDown, Lock, Plus, Trash2, UserCog } from "lucide-react-native";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { Can } from "@/components/can";
import { confirm, confirmDelete } from "@/components/refine-ui/confirm";
import { SectionLabel } from "@/components/refine-ui/field-row";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { CompletionReportCard } from "@/components/project/completion-report-card";
import { humanizeStatus } from "@/components/project/detail-config";
import { useTeamMembers } from "@/components/project/use-team-members";
import { usePermissions } from "@/hooks/use-permissions";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { ActionMenu } from "@/components/ui/action-menu";
import { Icon } from "@/components/ui/icon";
import { showApiError } from "@/components/ui/error-alert";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";
import { stageUnlocked } from "@/lib/stage-lock";

function apiErrMsg(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
}

interface Stage extends BaseRecord {
  id: string;
  name?: string;
  status?: string;
  sequence?: number;
  incomingLinks?: Array<{ fromStageId: string }>;
}
interface Process extends BaseRecord {
  id: string;
  overallStatus?: string;
  requireEstimates?: boolean;
  responsibleUserId?: string | null;
  responsibleUser?: { name?: string };
  stages?: Stage[];
}

function StageRow({
  projectId,
  processId,
  stage,
  unlocked,
  canDelete,
  onDelete,
}: {
  projectId: string;
  processId: string;
  stage: Stage;
  unlocked: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const router = useRouter();
  // Locked stages stay CLICKABLE (web parity): the detail screen is where the
  // responsible edits a pending stage — only Start/Complete are lock-gated.
  return (
    <View className="flex-row items-center gap-2 border-t border-border p-3">
      <Pressable
        className="flex-1 flex-row items-center gap-2"
        onPress={() =>
          router.push(
            `/projects/${projectId}/stage/${stage.id}?processId=${processId}`,
          )
        }
      >
        {!unlocked ? (
          <Icon icon={Lock} size={14} color={colors.mutedForeground} />
        ) : null}
        <Text
          className={unlocked ? "flex-1 text-sm text-foreground" : "flex-1 text-sm text-muted-foreground"}
        >
          {stage.name}
        </Text>
      </Pressable>
      {stage.status ? <StatusBadge label={stage.status} /> : null}
      {canDelete ? (
        <Pressable onPress={onDelete} hitSlop={6} className="h-8 w-8 items-center justify-center rounded-md active:bg-accent">
          <Icon icon={Trash2} size={14} color={colors.destructive} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ProcessCard({
  projectId,
  process,
  refresh,
}: {
  projectId: string;
  process: Process;
  refresh: () => void;
}) {
  const router = useRouter();
  const { members } = useTeamMembers(projectId);
  const { has } = usePermissions();
  const isAdmin = useIsAdmin();
  const { data: identity } = useGetIdentity<{ id: string }>();
  // Structural stage editing (add/delete) is relationship-based: only the
  // process's responsible user or an admin (backend enforces too) — web parity.
  const canEditProcess =
    isAdmin || (!!identity?.id && identity.id === process.responsibleUserId);
  // Structure freeze: while the process runs, stages can't be added or
  // removed (backend enforces too) — editing existing stages stays allowed.
  const structureLocked = process.overallStatus === "in_progress";
  // Types were removed — a stage is added by name alone (plus mandatory
  // estimates when the process requires them, mirroring the web dialog).
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageEst, setNewStageEst] = useState({
    start: "",
    completed: "",
    duration: "",
  });

  const stages = [...(process.stages ?? [])].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
  );

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      refresh();
      toast.success(msg);
    } catch (err) {
      showApiError(err, "İşlem başarısız");
    }
  };

  const estOk =
    !process.requireEstimates ||
    (newStageEst.start !== "" &&
      newStageEst.completed !== "" &&
      Number(newStageEst.duration) > 0);

  const addStage = () => {
    const name = newStageName.trim();
    if (!name || !estOk) return;
    setNewStageName("");
    setNewStageEst({ start: "", completed: "", duration: "" });
    setAddingStage(false);
    void run(
      () =>
        axiosInstance.post(`/processes/${process.id}/stages`, {
          name,
          ...(process.requireEstimates
            ? {
                estimatedStartDate: newStageEst.start,
                estimatedCompletedDate: newStageEst.completed,
                estimatedDurationHours: Number(newStageEst.duration) || 0,
              }
            : {}),
        }),
      "Stage added",
    );
  };

  const deleteStage = (stageId: string) =>
    confirmDelete("stage", () =>
      run(() => axiosInstance.delete(`/process-stages/${stageId}`), "Stage removed"),
    );

  const setResponsible = (userId: string | null) =>
    run(
      () => axiosInstance.patch(`/processes/${process.id}`, { responsibleUserId: userId }),
      "Responsible updated",
    );

  const deleteProcess = () =>
    confirm({
      title: "Delete process?",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () =>
        run(() => axiosInstance.delete(`/processes/${process.id}`), "Process deleted"),
    });

  return (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <View className="flex-row items-center justify-between border-b border-border p-3">
        <View className="flex-1">
          <Text className="font-sans-semibold text-sm text-card-foreground">
            {"Process"}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {humanizeStatus(process.overallStatus)}
            {process.responsibleUser?.name
              ? ` · ${process.responsibleUser.name}`
              : ""}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          {process.overallStatus === "draft" ? (
            <Can resource="process-stages" action="create-reorder">
              <Pressable
                onPress={() =>
                  router.push(
                    `/projects/${projectId}/reorder-stages?processId=${process.id}`,
                  )
                }
                hitSlop={6}
                className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
              >
                <Icon icon={ArrowUpDown} size={16} color={colors.mutedForeground} />
              </Pressable>
            </Can>
          ) : null}
          <Can resource="processes" action="update">
            <ActionMenu
              title="Responsible"
              options={[
                { label: "— None —", onPress: () => setResponsible(null) },
                ...members.map((m) => ({
                  label: m.name ?? m.id,
                  onPress: () => setResponsible(m.id),
                })),
              ]}
              trigger={(open) => (
                <Pressable onPress={open} hitSlop={6} className="h-8 w-8 items-center justify-center rounded-md active:bg-accent">
                  <Icon icon={UserCog} size={16} color={colors.mutedForeground} />
                </Pressable>
              )}
            />
          </Can>
          {structureLocked || !canEditProcess ? null : (
          <Can resource="process-stages" action="create-stages">
            <Pressable
              onPress={() => setAddingStage((v) => !v)}
              hitSlop={6}
              className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
            >
              <Icon icon={Plus} size={18} color={colors.foreground} />
            </Pressable>
          </Can>
          )}
          {/* Leaf-first: a process can only be deleted once it has no stages. */}
          {stages.length === 0 ? (
            <Can resource="processes" action="delete">
              <Pressable onPress={deleteProcess} hitSlop={6} className="h-8 w-8 items-center justify-center rounded-md active:bg-accent">
                <Icon icon={Trash2} size={16} color={colors.destructive} />
              </Pressable>
            </Can>
          ) : null}
        </View>
      </View>

      {/* Inline add-stage row (types removed — a stage is just a name). */}
      {addingStage && !structureLocked ? (
        <View className="gap-2 border-t border-border p-3">
          <View className="flex-row items-center gap-2">
            <TextInput
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              placeholder="New stage name…"
              placeholderTextColor={colors.mutedForeground}
              value={newStageName}
              onChangeText={setNewStageName}
              onSubmitEditing={addStage}
              autoFocus
              returnKeyType="done"
            />
            <Pressable
              onPress={addStage}
              disabled={!newStageName.trim() || !estOk}
              className="h-10 items-center justify-center rounded-md border border-border px-3 active:bg-accent"
            >
              <Text className="text-sm text-foreground">Add</Text>
            </Pressable>
          </View>
          {/* Estimates are mandatory on this process (backend rejects without). */}
          {process.requireEstimates ? (
            <View className="flex-row items-center gap-2">
              <TextInput
                className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                placeholder="Start YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                value={newStageEst.start}
                onChangeText={(t) => setNewStageEst((p) => ({ ...p, start: t }))}
              />
              <TextInput
                className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                placeholder="End YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                value={newStageEst.completed}
                onChangeText={(t) =>
                  setNewStageEst((p) => ({ ...p, completed: t }))
                }
              />
              <TextInput
                className="h-10 w-16 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                placeholder="Saat"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                value={newStageEst.duration}
                onChangeText={(t) =>
                  setNewStageEst((p) => ({ ...p, duration: t }))
                }
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {stages.length === 0 ? (
        <Text className="p-3 text-sm text-muted-foreground">No stages yet</Text>
      ) : (
        stages.map((s, i) => (
          <StageRow
            key={s.id}
            projectId={projectId}
            processId={process.id}
            stage={s}
            unlocked={stageUnlocked(stages, i)}
            canDelete={canEditProcess && !structureLocked}
            onDelete={() => deleteStage(s.id)}
          />
        ))
      )}

      {process.overallStatus === "completed" ? (
        <View className="border-t border-border p-3">
          <CompletionReportCard
            endpoint={`/processes/${process.id}/completion-report`}
            editable={has("processes:update")}
          />
        </View>
      ) : null}
    </View>
  );
}

export function OrderProcesses({
  projectId,
  orderItemId,
  orderId,
}: {
  projectId: string;
  orderItemId: string;
  orderId: string;
}) {
  const router = useRouter();
  const invalidate = useInvalidate();
  const { result } = useList<Process>({
    resource: "processes",
    filters: [{ field: "orderItemId", operator: "eq", value: orderItemId }],
    sorters: [{ field: "createdAt", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const processes = result?.data ?? [];
  const refresh = () => invalidate({ resource: "processes", invalidates: ["list"] });

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <SectionLabel>Processes</SectionLabel>
        <Can resource="processes" action="create">
          <Pressable
            onPress={() =>
              router.push(
                `/projects/${projectId}/process-new?orderItemId=${orderItemId}&orderId=${orderId}`,
              )
            }
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
          >
            <Icon icon={Plus} size={18} color={colors.foreground} />
          </Pressable>
        </Can>
      </View>
      {processes.length === 0 ? (
        <Text className="text-sm text-muted-foreground">No processes yet.</Text>
      ) : (
        processes.map((p) => (
          <ProcessCard key={p.id} projectId={projectId} process={p} refresh={refresh} />
        ))
      )}
    </View>
  );
}
