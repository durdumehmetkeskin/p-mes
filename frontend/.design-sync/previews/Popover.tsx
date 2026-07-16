import {
  Button,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from "frontend";
import { ListFilter } from "lucide-react";

export function StockFilter() {
  return (
    <div className="p-6">
      <Popover open>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <ListFilter />
            Filter stock
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="grid gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Stock on hand</p>
              <p className="text-muted-foreground text-xs">
                Narrow the material list by balance.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="min-qty">Min qty</Label>
                <Input id="min-qty" type="number" defaultValue="0" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="max-qty">Max qty</Label>
                <Input id="max-qty" type="number" placeholder="Any" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="below-reorder" defaultChecked />
              <Label htmlFor="below-reorder" className="text-sm font-normal">
                Only below reorder point
              </Label>
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm">
                Clear
              </Button>
              <Button size="sm">Apply</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function QuickEditReorder() {
  return (
    <div className="p-6">
      <Popover open>
        <PopoverTrigger asChild>
          <Button variant="outline">Edit reorder rule</Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="grid gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">
                Steel Bracket M-204
              </p>
              <p className="text-muted-foreground text-xs">
                Replenishment settings
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reorder-point">Reorder point</Label>
              <Input id="reorder-point" type="number" defaultValue="500" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="safety-stock">Safety stock</Label>
              <Input id="safety-stock" type="number" defaultValue="150" />
            </div>
            <Button size="sm" className="w-full">
              Save changes
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
