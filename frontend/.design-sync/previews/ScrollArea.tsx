import { ScrollArea, Separator, Badge } from "frontend";

const bins = [
  { code: "A-01-01", qty: "320 pcs" },
  { code: "A-01-02", qty: "180 pcs" },
  { code: "A-02-01", qty: "1,240 pcs" },
  { code: "A-02-02", qty: "0 pcs" },
  { code: "A-03-01", qty: "540 pcs" },
  { code: "A-03-02", qty: "76 pcs" },
  { code: "B-01-01", qty: "2,100 pcs" },
  { code: "B-01-02", qty: "410 pcs" },
  { code: "B-02-01", qty: "95 pcs" },
  { code: "B-02-02", qty: "630 pcs" },
];

export function BinLocations() {
  return (
    <ScrollArea className="h-64 w-72 rounded-md border">
      <div className="p-4">
        <h4 className="mb-3 text-sm font-medium leading-none">
          Bin locations — Warehouse A/B
        </h4>
        {bins.map((b) => (
          <div key={b.code}>
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="font-mono">{b.code}</span>
              <span className="text-muted-foreground">{b.qty}</span>
            </div>
            <Separator className="my-1" />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function MaterialList() {
  const materials = [
    "Steel Bracket M-204",
    "Hex Bolt M8 x 40",
    "Aluminium Sheet 2mm",
    "Copper Wire 1.5mm",
    "Rubber Gasket 60mm",
    "Ball Bearing 6204",
    "Nylon Spacer 10mm",
    "Zinc Washer M8",
    "PVC Conduit 20mm",
    "Cable Tie 200mm",
  ];
  return (
    <ScrollArea className="h-56 w-64 rounded-md border">
      <div className="p-3">
        {materials.map((m, i) => (
          <div key={m}>
            <div className="py-1.5 text-sm">{m}</div>
            {i < materials.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
