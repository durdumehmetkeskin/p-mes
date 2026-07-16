import { Slider, Label } from "frontend";

export function ReorderPoint() {
  return (
    <div className="grid w-80 gap-3 p-2">
      <div className="flex items-center justify-between">
        <Label>Reorder point</Label>
        <span className="text-muted-foreground text-sm">450 pcs</span>
      </div>
      <Slider defaultValue={[450]} max={2000} step={10} />
    </div>
  );
}

export function StockRange() {
  return (
    <div className="grid w-80 gap-3 p-2">
      <div className="flex items-center justify-between">
        <Label>On-hand filter</Label>
        <span className="text-muted-foreground text-sm">200 – 1,600 pcs</span>
      </div>
      <Slider defaultValue={[200, 1600]} max={2000} step={50} />
    </div>
  );
}
