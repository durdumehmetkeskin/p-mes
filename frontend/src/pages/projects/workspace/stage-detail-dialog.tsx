import { useApiUrl, useCustomMutation, useGetIdentity } from "@refinedev/core";
import { Pencil } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Can } from "@/components/can";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { AttachmentsPanel } from "./attachments-panel";
import { CompletionReportCard } from "./completion-report-card";
import { StageEditDialog } from "./stage-edit-dialog";
import {
  InheritedInputDocs,
  StageInputProductsPanel,
  StageProductDialog,
  StageProductsPanel,
} from "./stage-products";
import { StageDirectives } from "./stage-directives";
import { StageReservation } from "./stage-reservation";
import { StageStockItems } from "./stage-stock-items";
import { StageTools } from "./stage-tools";
import { timingLine } from "./time-format";

/** A read-only labelled row in the view dialog. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b py-2 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

export interface StageData {
  id: string;
  name: string;
  status: string;
  sequence: number;
  input?: string | null;
  output?: string | null;
  // DAG arrows into this stage (both kinds gate the client-side lock rule).
  incomingLinks?: Array<{ fromStageId: string; kind?: "sequence" | "io" }>;
  note: string | null;
  // Workers assigned to the stage (a stage has ONLY workers).
  workers?: Array<{ id: string; name: string }>;
  startedAt: string | null;
  completedAt: string | null;
  durationHours: number | null;
  estimatedStartDate: string | null;
  estimatedCompletedDate: string | null;
  estimatedDurationHours: number | null;
  stageType: { code: string; name: string } | null;
  // Work directives — written only by the stage responsible or an admin.
  directives?: string | null;
}

export function StageDetailDialog({
  stage,
  orderId,
  projectId,
  unlocked,
  canEditStage = false,
  siblings = [],
  open,
  onOpenChange,
  onChanged,
}: {
  stage: StageData;
  orderId: string;
  projectId: string;
  unlocked: boolean;
  /** Structural stage editing — process responsible or admin. */
  canEditStage?: boolean;
  /** The process's stages (id + name) for resolving connected-stage names. */
  siblings?: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}) {
  const apiUrl = useApiUrl();
  const { mutate } = useCustomMutation();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  // Whether the product dialog was auto-opened by completing the stage.
  const [productPrompted, setProductPrompted] = useState(false);

  const { has } = usePermissions();
  const { data: identity } = useGetIdentity<{ id: string }>();
  // Assigning order-pool stock onto this stage is a PLANNING act: process
  // responsible or admin only (workers just receive/return — backend mirrors).
  const canAssignStock = canEditStage;
  // Directives: the process responsible or an admin (backend mirrors).
  const isAdmin = useIsAdmin();
  const canEditDirectives = isAdmin || canEditStage;
  // Status rights (backend mirrors): admin/process responsible = every
  // transition; a stage worker = start + complete on their own stage only.
  const canStatusAll = isAdmin || canEditStage;
  const canStatusWorker =
    !!identity?.id && (stage.workers ?? []).some((w) => w.id === identity.id);
  // Stages whose OUT port is connected to this stage's IN port — their
  // output products/documents flow in as this stage's inputs.
  const siblingName = new Map(siblings.map((s) => [s.id, s.name]));
  const ioPredecessors = (stage.incomingLinks ?? [])
    .filter((l) => l.kind === "io")
    .map((l) => ({
      id: l.fromStageId,
      name: siblingName.get(l.fromStageId) ?? "connected stage",
    }));
  const status = stage.status;

  const setStatus = (next: string) => {
    setBusy(true);
    mutate(
      {
        url: `${apiUrl}/process-stages/${stage.id}/status`,
        method: "patch",
        values: { status: next },
      },
      {
        onSuccess: () => {
          onChanged();
          setBusy(false);
          // Completing a stage offers to record what it produced (optional,
          // dismissable — the panel below remains as the recovery path).
          if (next === "completed" && has("products:create")) {
            setProductPrompted(true);
            setProductOpen(true);
          }
        },
        onError: () => setBusy(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>
              {stage.sequence}. {stage.name}
            </span>
            {stage.stageType && (
              <Badge variant="outline">{stage.stageType.code}</Badge>
            )}
            <StatusBadge label={String(status).replace(/_/g, " ")} />
            {canEditStage && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Status controls (sequential gating enforced by the backend) */}
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
          <span className="text-sm font-medium">Status:</span>
          {status === "pending" && (canStatusAll || canStatusWorker) && (
            <Button size="sm" disabled={!unlocked || busy} onClick={() => setStatus("in_progress")}>
              Start
            </Button>
          )}
          {status === "in_progress" && (
            <>
              {(canStatusAll || canStatusWorker) && (
                <Button size="sm" disabled={busy} onClick={() => setStatus("completed")}>
                  Mark complete
                </Button>
              )}
              {canStatusAll && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("pending")}>
                  Reset
                </Button>
              )}
            </>
          )}
          {/* pending→completed shortcut skips the worker's own start — kept
              for the responsible/admin only (backend 403s a worker). */}
          {status === "pending" && canStatusAll && (
            <Button
              size="sm"
              variant="outline"
              disabled={!unlocked || busy}
              onClick={() => setStatus("completed")}
            >
              Mark complete
            </Button>
          )}
          {status === "completed" && canStatusAll && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("in_progress")}>
              Reopen
            </Button>
          )}
          {!unlocked && (
            <span className="text-sm text-muted-foreground">
              Locked — complete the prerequisite stages first.
            </span>
          )}
          <div className="w-full text-xs text-muted-foreground">
            {timingLine(stage.startedAt, stage.completedAt, stage.durationHours)}
          </div>
        </div>

        {/* Stage info — read-only; editing happens in the separate Edit modal. */}
        <div className="rounded-md border p-3">
          <Field label="Stage name">{stage.name}</Field>
          <Field label="Workers">
            {(stage.workers ?? []).map((w) => w.name).join(", ") || "—"}
          </Field>
          <Field label="Duration">
            {stage.durationHours != null ? `${stage.durationHours} h` : "—"}
          </Field>
          <Field label="Note / attachment link">{stage.note ?? "—"}</Field>
          <Field label="Estimated dates">
            {[stage.estimatedStartDate, stage.estimatedCompletedDate]
              .filter(Boolean)
              .join(" → ") || "—"}
          </Field>
          <Field label="Est. duration">
            {stage.estimatedDurationHours != null
              ? `${stage.estimatedDurationHours} h`
              : "—"}
          </Field>
        </div>

        {/* Work directives — editable only by the stage responsible/admin;
            read-only for everyone else on the project. */}
        <StageDirectives
          stageId={stage.id}
          directives={stage.directives}
          canEdit={canEditDirectives}
          onChanged={onChanged}
        />

        {/* Completion report — only once the stage is completed */}
        {status === "completed" && (
          <CompletionReportCard
            endpoint={`/process-stages/${stage.id}/completion-report`}
            editable={has("process-stages:update")}
            title="Completion report"
          />
        )}

        {/* Inputs: products consumed by this stage, outputs flowing in via
            OUT → IN canvas connections, and input documents (MinIO). */}
        <div className="space-y-3 rounded-md border p-3">
          <div className="text-sm font-semibold">
            Inputs
            {stage.input && (
              <span className="ml-2 font-normal text-muted-foreground">
                — {stage.input}
              </span>
            )}
          </div>
          <StageInputProductsPanel
            stageId={stage.id}
            orderId={orderId}
            predecessorStageIds={(stage.incomingLinks ?? []).map(
              (l) => l.fromStageId,
            )}
            ioPredecessorStageIds={ioPredecessors.map((p) => p.id)}
          />
          <InheritedInputDocs stages={ioPredecessors} />
          <AttachmentsPanel
            ownerType="stage_input"
            ownerId={stage.id}
            title="Input documents"
          />
        </div>

        {/* Outputs: products produced by this stage and/or output documents
            (stage_output attachments, stored in MinIO). */}
        <div className="space-y-3 rounded-md border p-3">
          <div className="text-sm font-semibold">
            Outputs
            {stage.output && (
              <span className="ml-2 font-normal text-muted-foreground">
                — {stage.output}
              </span>
            )}
          </div>
          <StageProductsPanel
            stageId={stage.id}
            onAdd={() => {
              setProductPrompted(false);
              setProductOpen(true);
            }}
          />
          <AttachmentsPanel
            ownerType="stage_output"
            ownerId={stage.id}
            title="Output documents"
          />
        </div>

        {/* Stock items reserved for this stage (reservation → handover) +
            the order's reserved pool to assign from. */}
        <StageStockItems
          stageId={stage.id}
          orderId={orderId}
          canAssign={canAssignStock}
        />

        {/* Tools reserved for this stage (gates start until received).
            Reservations live inside the stage's date window. */}
        <StageTools
          stageId={stage.id}
          stageCompleted={stage.status === "completed"}
          windowStart={
            stage.startedAt?.slice(0, 10) ?? stage.estimatedStartDate ?? null
          }
          windowEnd={
            stage.completedAt?.slice(0, 10) ??
            stage.estimatedCompletedDate ??
            null
          }
        />

        <Can perm="section-reservations:create">
          <StageReservation
            stageId={stage.id}
            orderId={orderId}
            windowStart={
              stage.startedAt?.slice(0, 10) ?? stage.estimatedStartDate ?? null
            }
            windowEnd={
              stage.completedAt?.slice(0, 10) ??
              stage.estimatedCompletedDate ??
              null
            }
            onChanged={onChanged}
          />
        </Can>

        <div className="rounded-md border p-3">
          <AttachmentsPanel ownerType="stage" ownerId={stage.id} />
        </div>
      </DialogContent>

      {/* Separate edit modal; remounts on each open so it seeds fresh values. */}
      {editOpen && (
        <StageEditDialog
          stage={stage}
          projectId={projectId}
          open={editOpen}
          onOpenChange={setEditOpen}
          onChanged={onChanged}
        />
      )}

      {/* Record-produced-product modal (auto-opened on completion, and from
          the produced-products panel). Remounts so the form starts fresh. */}
      {productOpen && (
        <StageProductDialog
          stageId={stage.id}
          open={productOpen}
          onOpenChange={setProductOpen}
          prompted={productPrompted}
        />
      )}
    </Dialog>
  );
}
