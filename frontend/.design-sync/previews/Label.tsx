import { Label, Input, Checkbox, Switch } from "frontend";

export function FieldLabel() {
  return (
    <div className="grid w-72 gap-1.5 p-2">
      <Label htmlFor="bin">Bin location</Label>
      <Input id="bin" defaultValue="A-14-02" />
    </div>
  );
}

export function WithControls() {
  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="flex items-center gap-2">
        <Checkbox id="lot-tracked" defaultChecked />
        <Label htmlFor="lot-tracked">Lot tracked</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="material-active" defaultChecked />
        <Label htmlFor="material-active">Material active</Label>
      </div>
    </div>
  );
}
