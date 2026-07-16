import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Card,
  CardContent,
  Badge,
} from "frontend";

const materials = [
  { sku: "STEEL-001", name: "Steel Bracket M-204", qty: "1,240 pcs" },
  { sku: "ALU-118", name: "Aluminium Profile 40x40", qty: "860 m" },
  { sku: "PACK-052", name: "Carton Box 600x400", qty: "3,500 pcs" },
];

export function MaterialSlides() {
  return (
    <div className="flex justify-center px-12 py-4">
      <Carousel className="w-full max-w-xs">
        <CarouselContent>
          {materials.map((m) => (
            <CarouselItem key={m.sku}>
              <Card>
                <CardContent className="flex h-40 flex-col items-center justify-center gap-2 p-6 text-center">
                  <Badge variant="secondary">{m.sku}</Badge>
                  <span className="text-lg font-semibold">{m.name}</span>
                  <span className="text-muted-foreground text-sm">
                    On-hand {m.qty}
                  </span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

export function WarehouseSlides() {
  const warehouses = [
    { code: "WH-01", name: "Main distribution center", bins: 128 },
    { code: "WH-02", name: "Cold storage annex", bins: 42 },
    { code: "WH-03", name: "Returns & quarantine", bins: 24 },
  ];
  return (
    <div className="flex justify-center px-12 py-4">
      <Carousel className="w-full max-w-xs">
        <CarouselContent>
          {warehouses.map((w) => (
            <CarouselItem key={w.code}>
              <Card>
                <CardContent className="flex h-40 flex-col items-center justify-center gap-2 p-6 text-center">
                  <span className="text-3xl font-bold tabular-nums">
                    {w.bins}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    bin locations
                  </span>
                  <span className="text-sm font-medium">
                    {w.code} · {w.name}
                  </span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
