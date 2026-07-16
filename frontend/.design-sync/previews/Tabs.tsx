import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
} from "frontend";

export function MaterialTabs() {
  return (
    <div className="w-[420px] rounded-md border p-3">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Steel Bracket M-204</span>
            <Badge variant="secondary">Raw material</Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            Unit pcs · Warehouse A · Reorder point 500 pcs · Lot tracking on.
          </p>
        </TabsContent>
        <TabsContent value="stock" className="pt-3 text-sm">
          <p className="text-muted-foreground">
            On-hand 1,240 pcs across 3 bins. 180 pcs reserved for WO-3187.
          </p>
        </TabsContent>
        <TabsContent value="history" className="pt-3 text-sm">
          <p className="text-muted-foreground">
            Last movement: goods issue 60 pcs on 12.06.2026 against WO-3187.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function SensorTabs() {
  return (
    <div className="w-[420px] rounded-md border p-3">
      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="chart" className="pt-3 text-sm">
          <p className="text-muted-foreground">
            Temperature 18–24°C (avg 21.3), humidity 40–55% RH over the selected
            range.
          </p>
        </TabsContent>
        <TabsContent value="table" className="pt-3 text-sm">
          <p className="text-muted-foreground">
            Raw readings for Warehouse A — 4,820 rows, 1 sn resolution.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
