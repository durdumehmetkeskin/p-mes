import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "frontend";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

const movementConfig = {
  receipts: { label: "Goods receipt", color: "var(--chart-1)" },
  issues: { label: "Goods issue", color: "var(--chart-2)" },
};

const movementData = [
  { month: "Jan", receipts: 1860, issues: 1420 },
  { month: "Feb", receipts: 2050, issues: 1680 },
  { month: "Mar", receipts: 1720, issues: 1990 },
  { month: "Apr", receipts: 2380, issues: 2100 },
  { month: "May", receipts: 2110, issues: 1870 },
  { month: "Jun", receipts: 2540, issues: 2260 },
];

export function StockMovements() {
  return (
    <div className="w-full max-w-xl p-2">
      <ChartContainer config={movementConfig} className="h-[220px] w-full">
        <BarChart data={movementData}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="receipts" fill="var(--color-receipts)" radius={4} />
          <Bar dataKey="issues" fill="var(--color-issues)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

const statusConfig = {
  count: { label: "Work orders", color: "var(--chart-1)" },
};

const statusData = [
  { status: "Draft", count: 8 },
  { status: "Released", count: 21 },
  { status: "In progress", count: 14 },
  { status: "On hold", count: 5 },
  { status: "Done", count: 32 },
];

export function OrdersByStatus() {
  return (
    <div className="w-full max-w-xl p-2">
      <ChartContainer config={statusConfig} className="h-[220px] w-full">
        <BarChart data={statusData}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
