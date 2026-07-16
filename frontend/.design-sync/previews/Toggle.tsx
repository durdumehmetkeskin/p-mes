import { Toggle } from "frontend";
import { Star, Bell, Filter } from "lucide-react";

export function Default() {
  return (
    <div className="flex flex-wrap items-center gap-3 p-2">
      <Toggle defaultPressed aria-label="Show low stock only">
        Low stock
      </Toggle>
      <Toggle aria-label="Show in stock only">In stock</Toggle>
    </div>
  );
}

export function Outline() {
  return (
    <div className="flex flex-wrap items-center gap-3 p-2">
      <Toggle variant="outline" defaultPressed aria-label="Watch material">
        <Star /> Watch material
      </Toggle>
      <Toggle variant="outline" aria-label="Stock alerts">
        <Bell /> Alerts
      </Toggle>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-3 p-2">
      <Toggle size="sm" variant="outline" defaultPressed aria-label="Small filter">
        <Filter />
      </Toggle>
      <Toggle size="default" variant="outline" defaultPressed aria-label="Default filter">
        <Filter />
      </Toggle>
      <Toggle size="lg" variant="outline" defaultPressed aria-label="Large filter">
        <Filter />
      </Toggle>
    </div>
  );
}
