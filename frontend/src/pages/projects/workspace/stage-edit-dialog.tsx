import { useApiUrl, useCustomMutation } from "@refinedev/core";
import { X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import type { StageData } from "./stage-detail-dialog";
import { useTeamMembers } from "./use-team-members";

/**
 * Edit modal for a stage's info fields — opened from the (view-only) stage
 * detail dialog. Saves via PATCH /process-stages/:id.
 */
export function StageEditDialog({
  stage,
  projectId,
  open,
  onOpenChange,
  onChanged,
}: {
  stage: StageData;
  projectId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}) {
  const apiUrl = useApiUrl();
  const { mutate } = useCustomMutation();
  // Workers are picked from the project team.
  const members = useTeamMembers(projectId);

  const [name, setName] = useState(stage.name);
  const [note, setNote] = useState(stage.note ?? "");
  // Multiple workers — a stage has ONLY workers (no responsible).
  const [workerIds, setWorkerIds] = useState<string[]>(
    (stage.workers ?? []).map((w) => w.id),
  );
  const workerName = (id: string) =>
    members.find((m) => m.id === id)?.name ??
    (stage.workers ?? []).find((w) => w.id === id)?.name ??
    id;
  const [duration, setDuration] = useState(
    stage.durationHours != null ? String(stage.durationHours) : "",
  );
  const [estStart, setEstStart] = useState(stage.estimatedStartDate ?? "");
  const [estCompleted, setEstCompleted] = useState(
    stage.estimatedCompletedDate ?? "",
  );
  const [estDuration, setEstDuration] = useState(
    stage.estimatedDurationHours != null
      ? String(stage.estimatedDurationHours)
      : "",
  );
  const [busy, setBusy] = useState(false);

  const save = () => {
    setBusy(true);
    mutate(
      {
        url: `${apiUrl}/process-stages/${stage.id}`,
        method: "patch",
        values: {
          name: name.trim() || stage.name,
          note: note || undefined,
          workerIds,
          durationHours: duration === "" ? 0 : Math.max(0, Number(duration) || 0),
          estimatedStartDate: estStart || undefined,
          estimatedCompletedDate: estCompleted || undefined,
          estimatedDurationHours:
            estDuration === "" ? undefined : Math.max(0, Number(estDuration) || 0),
        },
      },
      {
        onSuccess: () => {
          setBusy(false);
          onChanged();
          onOpenChange(false);
        },
        onError: () => setBusy(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Edit stage · {stage.sequence}. {stage.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="stage-name">Stage name</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="stage-duration">Duration (hours)</Label>
            <Input
              id="stage-duration"
              type="number"
              min="0"
              step="0.25"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Workers (team)</Label>
          {members.length === 0 && (
            <span className="text-xs text-muted-foreground">
              Assign users to the project Team first.
            </span>
          )}
          {workerIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {workerIds.map((wid) => (
                <Badge key={wid} variant="secondary" className="gap-1 pr-1">
                  {workerName(wid)}
                  <button
                    type="button"
                    aria-label="Remove worker"
                    className="rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() =>
                      setWorkerIds((prev) => prev.filter((id) => id !== wid))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Select
            value=""
            onValueChange={(v) =>
              setWorkerIds((prev) => (prev.includes(v) ? prev : [...prev, v]))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add worker…" />
            </SelectTrigger>
            <SelectContent>
              {members
                .filter((m) => !workerIds.includes(m.id))
                .map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stage-note">Note / attachment link</Label>
          <Textarea
            id="stage-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-1">
            <Label className="text-xs">Est. start</Label>
            <Input
              type="date"
              value={estStart}
              onChange={(e) => setEstStart(e.target.value)}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <Label className="text-xs">Est. completed</Label>
            <Input
              type="date"
              value={estCompleted}
              onChange={(e) => setEstCompleted(e.target.value)}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <Label className="text-xs">Est. duration (h)</Label>
            <Input
              type="number"
              min="0"
              step="0.25"
              value={estDuration}
              onChange={(e) => setEstDuration(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
