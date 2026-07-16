import { Progress } from "frontend";

export function OrderFulfillment() {
  const orders = [
    { code: "WO-2026-0142", value: 25 },
    { code: "WO-2026-0143", value: 60 },
    { code: "WO-2026-0144", value: 100 },
  ];
  return (
    <div className="w-80 space-y-4 p-2">
      {orders.map((o) => (
        <div key={o.code} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{o.code}</span>
            <span className="text-muted-foreground">{o.value}%</span>
          </div>
          <Progress value={o.value} />
        </div>
      ))}
    </div>
  );
}

export function CapacityUsage() {
  return (
    <div className="w-80 space-y-1.5 p-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Warehouse A capacity</span>
        <span className="text-muted-foreground">82%</span>
      </div>
      <Progress value={82} />
      <p className="text-muted-foreground text-xs">
        8,200 of 10,000 pallet positions occupied
      </p>
    </div>
  );
}
