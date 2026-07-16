import { Input, Label } from "frontend";
import { Search } from "lucide-react";

export function Default() {
  return (
    <div className="w-72 p-2">
      <Input placeholder="Search materials…" />
    </div>
  );
}

export function WithLabel() {
  return (
    <div className="grid w-72 gap-4 p-2">
      <div className="grid gap-1.5">
        <Label htmlFor="material-code">Material code</Label>
        <Input id="material-code" defaultValue="RM-STL-204" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="qty">Quantity on hand</Label>
        <Input id="qty" type="number" defaultValue={1240} />
      </div>
    </div>
  );
}

export function SearchField() {
  return (
    <div className="w-72 p-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="Search work orders…"
          className="pl-9"
        />
      </div>
    </div>
  );
}

export function Disabled() {
  return (
    <div className="grid w-72 gap-1.5 p-2">
      <Label htmlFor="sku">SKU (system-assigned)</Label>
      <Input id="sku" defaultValue="SKU-000481" disabled />
    </div>
  );
}
