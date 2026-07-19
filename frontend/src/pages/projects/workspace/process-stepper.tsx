import {
  useApiUrl,
  useCustomMutation,
  useGetIdentity,
} from "@refinedev/core";
import { Plus } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { StageDetailDialog, type StageData } from "./stage-detail-dialog";

// The embedded DAG canvas — pulls in @xyflow/react + dagre, so lazy-loaded.
const ProcessCanvas = lazy(() => import("./workflow-canvas/process-canvas"));

/**
 * A process's stages rendered as the same Dify-style DAG canvas as the
 * template editor (embedded, not behind a button). While the process is a
 * draft, dependencies are edited directly on the canvas; clicking a node
 * opens the stage dialog. Stage deletion lives under the canvas.
 */
export function ProcessStepper({
  process,
  projectId,
  orderId,
  onChanged,
}: {
  process: {
    id: string;
    overallStatus: string;
    requireEstimates: boolean;
    responsibleUserId?: string | null;
    stages: StageData[];
  };
  projectId: string;
  orderId: string;
  onChanged: () => void;
}) {
  const apiUrl = useApiUrl();
  const isAdmin = useIsAdmin();
  const { data: identity } = useGetIdentity<{ id: string }>();
  // Structural stage editing (add/edit/connect/delete) is relationship-based:
  // only the process's responsible user or an admin (backend enforces too).
  const canEditProcess =
    isAdmin || (!!identity?.id && identity.id === process.responsibleUserId);
  const { mutate } = useCustomMutation();

  const [openStageId, setOpenStageId] = useState<string | null>(null);
  const [addValue, setAddValue] = useState("");
  // When the process requires estimates, adding a stage opens this dialog.
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [addEst, setAddEst] = useState({
    start: "",
    completed: "",
    duration: "",
  });

  const stages = [...process.stages].sort((a, b) => a.sequence - b.sequence);
  // DAG lock rule: a stage is unlocked iff every incoming-link source stage is
  // completed (no incoming links = startable root; independent branches run in
  // parallel). Fallback to the old prefix rule for payloads without links.
  const hasLinks = stages.some((s) => s.incomingLinks !== undefined);
  const completedIds = new Set(
    stages.filter((s) => s.status === "completed").map((s) => s.id),
  );
  const firstIncomplete = stages.findIndex((s) => s.status !== "completed");
  const currentIndex = firstIncomplete === -1 ? stages.length : firstIncomplete;
  const isUnlocked = (index: number) => {
    if (!hasLinks) return index <= currentIndex;
    const stage = stages[index];
    if (!stage) return false;
    return (stage.incomingLinks ?? []).every((l) =>
      completedIds.has(l.fromStageId),
    );
  };
  // Dependencies are edited on the graph while the process is a draft.
  const canEditGraph = process.overallStatus === "draft" && canEditProcess;
  // Structure freeze: while the process runs, stages can't be added or
  // removed (backend enforces too) — editing existing stages stays allowed.
  const structureLocked = process.overallStatus === "in_progress";

  const addStage = () => {
    const name = addValue.trim();
    if (!name) return;
    setAddValue("");
    if (process.requireEstimates) {
      // Collect the mandatory estimates before creating the stage.
      setAddEst({ start: "", completed: "", duration: "" });
      setPendingName(name);
      return;
    }
    mutate(
      {
        url: `${apiUrl}/processes/${process.id}/stages`,
        method: "post",
        values: { name },
      },
      { onSuccess: onChanged },
    );
  };

  const addEstOk =
    addEst.start !== "" && addEst.completed !== "" && addEst.duration !== "";

  const confirmAddWithEstimates = () => {
    if (!pendingName) return;
    mutate(
      {
        url: `${apiUrl}/processes/${process.id}/stages`,
        method: "post",
        values: {
          name: pendingName,
          estimatedStartDate: addEst.start,
          estimatedCompletedDate: addEst.completed,
          estimatedDurationHours: Number(addEst.duration) || 0,
        },
      },
      {
        onSuccess: () => {
          setPendingName(null);
          onChanged();
        },
      },
    );
  };

  const removeStage = (stageId: string) =>
    mutate(
      {
        url: `${apiUrl}/process-stages/${stageId}`,
        method: "delete",
        values: {},
      },
      { onSuccess: onChanged },
    );

  const openStage = stages.find((s) => s.id === openStageId) ?? null;
  const openIndex = stages.findIndex((s) => s.id === openStageId);

  return (
    <div>
      {stages.length ? (
        <Suspense
          fallback={<div className="h-[380px] animate-pulse rounded-md border" />}
        >
          <ProcessCanvas
            processId={process.id}
            orderId={orderId}
            stages={stages}
            editable={canEditGraph}
            movable={canEditProcess}
            onOpenStage={setOpenStageId}
            onDeleteStage={
              canEditProcess && !structureLocked ? removeStage : undefined
            }
            onChanged={onChanged}
          />
        </Suspense>
      ) : (
        <p className="mb-2 text-sm text-muted-foreground">
          No stages. Add stages below to build this process.
        </p>
      )}

      {canEditProcess &&
        (structureLocked ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Proses devam ederken aşama eklenemez veya silinemez — mevcut
            aşamalar düzenlenebilir.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input
              className="w-72"
              placeholder="New stage name…"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addStage();
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!addValue.trim()}
              onClick={addStage}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add stage
            </Button>
          </div>
        ))}


      {openStage && (
        <StageDetailDialog
          key={openStage.id}
          stage={openStage}
          orderId={orderId}
          projectId={projectId}
          unlocked={isUnlocked(openIndex)}
          canEditStage={canEditProcess}
          siblings={stages.map((s) => ({ id: s.id, name: s.name }))}
          open={Boolean(openStageId)}
          onOpenChange={(o) => !o && setOpenStageId(null)}
          onChanged={onChanged}
        />
      )}

      {/* Estimates required: collect them before adding the stage. */}
      <Dialog
        open={Boolean(pendingName)}
        onOpenChange={(o) => !o && setPendingName(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stage estimates</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Start</Label>
              <Input
                type="date"
                value={addEst.start}
                onChange={(e) =>
                  setAddEst((p) => ({ ...p, start: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Completed</Label>
              <Input
                type="date"
                value={addEst.completed}
                onChange={(e) =>
                  setAddEst((p) => ({ ...p, completed: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Duration (h)</Label>
              <Input
                type="number"
                min="0"
                step="0.25"
                value={addEst.duration}
                onChange={(e) =>
                  setAddEst((p) => ({ ...p, duration: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={!addEstOk} onClick={confirmAddWithEstimates}>
              Add stage
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
