import { Switch, Label } from "frontend";

export function WithLabel() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Switch id="auto-reorder" defaultChecked />
      <Label htmlFor="auto-reorder">Auto-reorder when below threshold</Label>
    </div>
  );
}

export function SettingsList() {
  return (
    <div className="flex w-80 flex-col gap-4 p-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="s-serial">Track serial numbers</Label>
        <Switch id="s-serial" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="s-lot">Track lot numbers</Label>
        <Switch id="s-lot" />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="s-active">Material active</Label>
        <Switch id="s-active" defaultChecked />
      </div>
    </div>
  );
}

export function Disabled() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Switch id="s-audit" defaultChecked disabled />
      <Label htmlFor="s-audit">Audit logging (enforced)</Label>
    </div>
  );
}
