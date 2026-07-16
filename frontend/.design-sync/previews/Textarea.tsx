import { Textarea, Label } from "frontend";

export function Notes() {
  return (
    <div className="grid w-80 gap-1.5 p-2">
      <Label htmlFor="gr-notes">Goods receipt notes</Label>
      <Textarea
        id="gr-notes"
        rows={4}
        defaultValue="Pallet 3 of 5 received with minor crate damage. 12 units quarantined for QA inspection; remainder moved to bin A-14-02."
      />
    </div>
  );
}

export function Disabled() {
  return (
    <div className="grid w-80 gap-1.5 p-2">
      <Label htmlFor="closed-note">Closure note (read-only)</Label>
      <Textarea
        id="closed-note"
        rows={4}
        disabled
        defaultValue="Work order WO-2048 closed on 2026-06-28. All operations completed and finished stock posted to WH-01."
      />
    </div>
  );
}
