import { Badge } from "frontend";
import { Check, AlertTriangle, Package } from "lucide-react";

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3 p-2">
      <Badge>default</Badge>
      <Badge variant="secondary">secondary</Badge>
      <Badge variant="destructive">destructive</Badge>
      <Badge variant="outline">outline</Badge>
    </div>
  );
}

export function StatusChips() {
  return (
    <div className="flex flex-wrap items-center gap-3 p-2">
      <Badge variant="secondary">In stock</Badge>
      <Badge variant="destructive">Low</Badge>
      <Badge variant="outline">Out of stock</Badge>
      <Badge variant="outline">Draft</Badge>
      <Badge>Released</Badge>
    </div>
  );
}

export function WithIcon() {
  return (
    <div className="flex flex-wrap items-center gap-3 p-2">
      <Badge>
        <Check /> Released
      </Badge>
      <Badge variant="destructive">
        <AlertTriangle /> Reorder
      </Badge>
      <Badge variant="secondary">
        <Package /> 1,240 pcs
      </Badge>
    </div>
  );
}
