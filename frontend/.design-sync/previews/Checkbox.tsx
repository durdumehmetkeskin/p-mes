import { Checkbox, Label } from "frontend";

export function WithLabel() {
  return (
    <div className="flex items-center gap-2 p-2">
      <Checkbox id="serial" defaultChecked />
      <Label htmlFor="serial">Track serial numbers</Label>
    </div>
  );
}

export function States() {
  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="flex items-center gap-2">
        <Checkbox id="c-on" defaultChecked />
        <Label htmlFor="c-on">Lot tracked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c-off" />
        <Label htmlFor="c-off">Backflush components</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c-dis" defaultChecked disabled />
        <Label htmlFor="c-dis">System-managed (locked)</Label>
      </div>
    </div>
  );
}

export function ColumnPicker() {
  const cols = [
    "Material code",
    "Description",
    "On-hand",
    "Reorder point",
    "Warehouse",
  ];
  return (
    <div className="flex flex-col gap-3 p-2">
      {cols.map((col, i) => (
        <div key={col} className="flex items-center gap-2">
          <Checkbox id={`col-${i}`} defaultChecked={i < 3} />
          <Label htmlFor={`col-${i}`}>{col}</Label>
        </div>
      ))}
    </div>
  );
}
