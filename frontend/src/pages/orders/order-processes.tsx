import {
  useCreate,
  useDelete,
  useInvalidate,
  useList,
  useOne,
  useUpdate,
} from "@refinedev/core";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AttachmentsPanel } from "../projects/workspace/attachments-panel";
import { Can } from "@/components/can";
import { CompletionReportCard } from "../projects/workspace/completion-report-card";
import { ConfirmDelete } from "../projects/workspace/confirm-delete";
import { ProcessStepper } from "../projects/workspace/process-stepper";
import type { StageData } from "../projects/workspace/stage-detail-dialog";
import { formatHours, timingLine } from "../projects/workspace/time-format";
import { useTeamMembers } from "../projects/workspace/use-team-members";
import { usePermissions } from "@/hooks/use-permissions";

const NO_RESPONSIBLE = "__none__";

interface ProcessRow {
  id: string;
  category: { id: string; name: string } | null;
  categoryId: string;
  overallStatus: string;
  usedTemplateId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationHours: number;
  requireEstimates: boolean;
  estimatedStartDate: string | null;
  estimatedCompletedDate: string | null;
  estimatedDurationHours: number | null;
  responsibleUserId: string | null;
  responsibleUser: { id: string; name: string } | null;
  stages: StageData[];
}
interface TemplateOpt {
  id: string;
  name: string;
  category: { name: string } | null;
}
interface CategoryOpt {
  id: string;
  name: string;
}

interface TemplateStageRow {
  id: string;
  sequence: number;
  name: string | null;
  stageType: { name: string } | null;
}
interface TemplateDetail {
  id: string;
  stages: TemplateStageRow[];
}
type Est = { start: string; completed: string; duration: string };
const emptyEst = (): Est => ({ start: "", completed: "", duration: "" });
const estComplete = (e: Est) =>
  e.start !== "" && e.completed !== "" && e.duration !== "";

function CreateProcessDialog({
  orderItemId,
  projectId,
}: {
  orderItemId: string;
  projectId: string;
}) {
  const { mutate } = useCreate();
  const invalidate = useInvalidate();
  const projectFilter = [
    { field: "projectId", operator: "eq" as const, value: projectId },
  ];
  const { result: templates } = useList<TemplateOpt>({
    resource: "workflow-templates",
    filters: projectFilter,
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(projectId) },
  });
  const { result: catResult } = useList<CategoryOpt>({
    resource: "stage-type-categories",
    filters: projectFilter,
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(projectId) },
  });
  const categories = catResult?.data ?? [];

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"template" | "scratch">("template");
  const [templateId, setTemplateId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [requireEstimates, setRequireEstimates] = useState(false);
  const [procEst, setProcEst] = useState<Est>(emptyEst());
  const [stageEst, setStageEst] = useState<Record<number, Est>>({});
  const [submitting, setSubmitting] = useState(false);

  // Template stages (to collect per-stage estimates when required).
  const { result: template } = useOne<TemplateDetail>({
    resource: "workflow-templates",
    id: templateId,
    queryOptions: {
      enabled: requireEstimates && mode === "template" && Boolean(templateId),
    },
  });
  const templateStages = [...(template?.stages ?? [])].sort(
    (a, b) => a.sequence - b.sequence,
  );

  const setStage = (i: number, patch: Partial<Est>) =>
    setStageEst((prev) => ({ ...prev, [i]: { ...(prev[i] ?? emptyEst()), ...patch } }));

  const reset = () => {
    setTemplateId("");
    setCategoryId("");
    setRequireEstimates(false);
    setProcEst(emptyEst());
    setStageEst({});
    setSubmitting(false);
  };

  // Validation.
  const baseOk = mode === "template" ? templateId !== "" : categoryId !== "";
  let estimatesOk = true;
  if (requireEstimates) {
    if (mode === "template") {
      estimatesOk =
        templateStages.length > 0 &&
        templateStages.every((_, i) => estComplete(stageEst[i] ?? emptyEst()));
    } else {
      estimatesOk = estComplete(procEst);
    }
  }
  const canSubmit = !submitting && baseOk && estimatesOk;

  const submit = () => {
    setSubmitting(true);
    const values: Record<string, unknown> =
      mode === "template"
        ? { orderItemId, templateId }
        : { orderItemId, categoryId };

    if (requireEstimates) {
      values.requireEstimates = true;
      if (mode === "template") {
        const ests = templateStages.map((_, i) => stageEst[i] ?? emptyEst());
        // Derive the process-level estimates from the stages.
        const starts = ests.map((e) => e.start).sort();
        const ends = ests.map((e) => e.completed).sort();
        values.estimatedStartDate = starts[0];
        values.estimatedCompletedDate = ends[ends.length - 1];
        values.estimatedDurationHours = ests.reduce(
          (s, e) => s + (Number(e.duration) || 0),
          0,
        );
        values.stageEstimates = ests.map((e) => ({
          estimatedStartDate: e.start,
          estimatedCompletedDate: e.completed,
          estimatedDurationHours: Number(e.duration) || 0,
        }));
      } else {
        values.estimatedStartDate = procEst.start;
        values.estimatedCompletedDate = procEst.completed;
        values.estimatedDurationHours = Number(procEst.duration) || 0;
      }
    }

    mutate(
      { resource: "processes", values },
      {
        onSuccess: () => {
          invalidate({ resource: "processes", invalidates: ["list"] });
          setOpen(false);
          reset();
        },
        onError: () => setSubmitting(false),
      },
    );
  };

  const dateField = (e: Est, onChange: (patch: Partial<Est>) => void) => (
    <div className="grid grid-cols-3 gap-2">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Start</Label>
        <Input
          type="date"
          value={e.start}
          onChange={(ev) => onChange({ start: ev.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Completed</Label>
        <Input
          type="date"
          value={e.completed}
          onChange={(ev) => onChange({ completed: ev.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Duration (h)</Label>
        <Input
          type="number"
          min="0"
          step="0.25"
          value={e.duration}
          onChange={(ev) => onChange({ duration: ev.target.value })}
        />
      </div>
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          New process
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a process</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "template" ? "default" : "outline"}
              onClick={() => setMode("template")}
            >
              From template
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "scratch" ? "default" : "outline"}
              onClick={() => setMode("scratch")}
            >
              From scratch
            </Button>
          </div>

          {mode === "template" ? (
            <div className="flex flex-col gap-2">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {(templates?.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.category ? ` (${t.category.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Template stages are copied into independent stages for this order.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Starts empty — add same-category stage types one by one.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-md border p-3">
            <Switch
              id="require-est"
              checked={requireEstimates}
              onCheckedChange={setRequireEstimates}
            />
            <Label htmlFor="require-est">
              Require estimates (start/completed date + duration)
            </Label>
          </div>

          {requireEstimates && mode === "scratch" && (
            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-sm font-medium">Process estimates</Label>
              {dateField(procEst, (patch) =>
                setProcEst((prev) => ({ ...prev, ...patch })),
              )}
            </div>
          )}

          {requireEstimates && mode === "template" && (
            <div className="space-y-3 rounded-md border p-3">
              <Label className="text-sm font-medium">
                Stage estimates ({templateStages.length})
              </Label>
              {templateId === "" ? (
                <p className="text-xs text-muted-foreground">
                  Select a template first.
                </p>
              ) : templateStages.length === 0 ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : (
                templateStages.map((s, i) => (
                  <div key={s.id} className="space-y-1">
                    <span className="text-xs font-medium">
                      {s.sequence}. {s.name ?? s.stageType?.name ?? "Stage"}
                    </span>
                    {dateField(stageEst[i] ?? emptyEst(), (patch) =>
                      setStage(i, patch),
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button disabled={!canSubmit} onClick={submit}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OrderProcesses({
  orderItemId,
  orderId,
  projectId,
}: {
  orderItemId: string;
  orderId: string;
  projectId: string;
}) {
  const invalidate = useInvalidate();
  const { mutate: removeProcess } = useDelete();
  const { mutate: updateProcess } = useUpdate();
  const members = useTeamMembers(projectId);
  const { has } = usePermissions();
  const canAssign = has("processes:update");
  const { result } = useList<ProcessRow>({
    resource: "processes",
    filters: [{ field: "orderItemId", operator: "eq", value: orderItemId }],
    sorters: [{ field: "createdAt", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(orderItemId) },
  });
  const processes = result?.data ?? [];

  const onChanged = () =>
    invalidate({ resource: "processes", invalidates: ["list"] });

  const setResponsible = (id: string, userId: string | null) =>
    updateProcess(
      { resource: "processes", id, values: { responsibleUserId: userId } },
      { onSuccess: onChanged },
    );

  const onDeleteProcess = (id: string) =>
    removeProcess(
      { resource: "processes", id },
      { onSuccess: onChanged },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Processes</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-normal text-muted-foreground">
              {processes.length} total
            </span>
            <Can perm="processes:create">
              <CreateProcessDialog
                orderItemId={orderItemId}
                projectId={projectId}
              />
            </Can>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {processes.length ? (
          processes.map((p) => (
            <div key={p.id} className="rounded-md border p-3">
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{p.category?.name ?? "—"}</Badge>
                  <StatusBadge
                    label={String(p.overallStatus).replace(/_/g, " ")}
                  />
                  <span className="text-muted-foreground">
                    {p.stages.length} stage{p.stages.length === 1 ? "" : "s"}
                    {p.usedTemplateId ? " · from template" : " · from scratch"}
                  </span>
                </div>
                {/* Leaf-first: a process can only be deleted once it has no stages. */}
                {p.stages.length === 0 && (
                  <Can perm="processes:delete">
                    <ConfirmDelete
                      title="Delete process?"
                      description="This process will be removed."
                      onConfirm={() => onDeleteProcess(p.id)}
                      trigger={
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          aria-label="Delete process"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </Can>
                )}
              </div>
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Responsible:</span>
                {canAssign ? (
                  <Select
                    value={p.responsibleUserId ?? NO_RESPONSIBLE}
                    onValueChange={(v) =>
                      setResponsible(p.id, v === NO_RESPONSIBLE ? null : v)
                    }
                  >
                    <SelectTrigger className="h-8 w-56">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_RESPONSIBLE}>
                        — Unassigned —
                      </SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">
                    {p.responsibleUser?.name ?? "Unassigned"}
                  </Badge>
                )}
              </div>
              {(p.startedAt || p.durationHours > 0) && (
                <div className="text-xs text-muted-foreground">
                  {timingLine(p.startedAt, p.completedAt, p.durationHours)}
                </div>
              )}
              {p.requireEstimates && p.estimatedStartDate && (
                <div className="mb-3 text-xs text-muted-foreground">
                  Est: {p.estimatedStartDate} → {p.estimatedCompletedDate ?? "—"}{" "}
                  · {formatHours(p.estimatedDurationHours)}
                </div>
              )}
              <ProcessStepper
                process={p}
                projectId={projectId}
                orderId={orderId}
                onChanged={onChanged}
              />
              {p.overallStatus === "completed" && (
                <div className="mt-4">
                  <CompletionReportCard
                    endpoint={`/processes/${p.id}/completion-report`}
                    editable={canAssign}
                    title="Process completion report"
                  />
                </div>
              )}
              <div className="mt-4 border-t pt-3">
                <AttachmentsPanel ownerType="process" ownerId={p.id} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No processes yet. Start one from a template or from scratch.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
