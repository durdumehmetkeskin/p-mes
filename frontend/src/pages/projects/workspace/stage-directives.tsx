import { useApiUrl, useCustomMutation } from "@refinedev/core";
import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Work directives for the stage. Written ONLY by the stage's responsible
 * user or an admin (backend-enforced via PUT /process-stages/:id/directives);
 * every other project member sees them read-only.
 */
export function StageDirectives({
  stageId,
  directives,
  canEdit,
  onChanged,
}: {
  stageId: string;
  directives: string | null | undefined;
  /** Admin or the stage's responsible user. */
  canEdit: boolean;
  onChanged: () => void;
}) {
  const apiUrl = useApiUrl();
  const { mutate } = useCustomMutation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const save = () => {
    setBusy(true);
    mutate(
      {
        url: `${apiUrl}/process-stages/${stageId}/directives`,
        method: "put",
        values: { directives: draft.trim() || null },
      },
      {
        onSuccess: () => {
          setBusy(false);
          setEditing(false);
          onChanged();
        },
        onError: () => setBusy(false),
      },
    );
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Directives</div>
        {canEdit && !editing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft(directives ?? "");
              setEditing(true);
            }}
          >
            <Pencil className="mr-1 h-4 w-4" />
            {directives ? "Edit" : "Add"}
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder="Work directives for this stage…"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={busy} onClick={save}>
              {busy ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      ) : directives ? (
        <p className="whitespace-pre-wrap text-sm">{directives}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          No directives for this stage yet.
          {canEdit ? "" : " Only the stage responsible or an admin can add them."}
        </p>
      )}
    </div>
  );
}
