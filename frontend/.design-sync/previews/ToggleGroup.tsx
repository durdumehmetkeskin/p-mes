import { ToggleGroup, ToggleGroupItem } from "frontend";
import { List, LayoutGrid, Table2 } from "lucide-react";

export function ViewToggle() {
  return (
    <div className="p-2">
      <ToggleGroup type="single" defaultValue="grid" variant="outline">
        <ToggleGroupItem value="list" aria-label="List view">
          <List /> List
        </ToggleGroupItem>
        <ToggleGroupItem value="grid" aria-label="Grid view">
          <LayoutGrid /> Grid
        </ToggleGroupItem>
        <ToggleGroupItem value="table" aria-label="Table view">
          <Table2 /> Table
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function StockFilter() {
  return (
    <div className="p-2">
      <ToggleGroup type="multiple" defaultValue={["in", "low"]}>
        <ToggleGroupItem value="in" aria-label="In stock">
          In stock
        </ToggleGroupItem>
        <ToggleGroupItem value="low" aria-label="Low stock">
          Low
        </ToggleGroupItem>
        <ToggleGroupItem value="out" aria-label="Out of stock">
          Out
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
