import { Separator } from "frontend";

export function HorizontalSections() {
  return (
    <div className="w-80 p-2">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Steel Bracket M-204</h4>
        <p className="text-muted-foreground text-sm">Raw material · Warehouse A</p>
      </div>
      <Separator className="my-4" />
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>On-hand</span>
        <span className="text-foreground font-medium">1,240 pcs</span>
      </div>
    </div>
  );
}

export function VerticalInline() {
  return (
    <div className="p-2">
      <div className="text-muted-foreground flex h-5 items-center gap-3 text-sm">
        <span>SKU M-204</span>
        <Separator orientation="vertical" />
        <span>Warehouse A</span>
        <Separator orientation="vertical" />
        <span>Bin A-12-03</span>
      </div>
    </div>
  );
}
