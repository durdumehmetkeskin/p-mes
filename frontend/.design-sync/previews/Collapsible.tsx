import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Button,
  Input,
  Label,
  Badge,
} from "frontend";
import { ChevronsUpDown, SlidersHorizontal } from "lucide-react";

export function AdvancedFilters() {
  return (
    <div className="w-96">
      <Collapsible defaultOpen className="rounded-md border">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex w-full items-center justify-between rounded-b-none px-3"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="size-4" /> Advanced filters
            </span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 border-t p-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cf-wh">Warehouse</Label>
            <Input id="cf-wh" defaultValue="Warehouse A" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cf-cat">Category</Label>
            <Input id="cf-cat" placeholder="Raw material" />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function BinBreakdown() {
  return (
    <div className="w-80">
      <Collapsible defaultOpen className="rounded-md border">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex w-full items-center justify-between rounded-b-none px-3"
          >
            <span className="text-sm font-medium">
              Steel Bracket M-204 · 3 bins
            </span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="divide-y border-t text-sm">
          <div className="flex items-center justify-between px-3 py-2">
            <span>Bin A-01-03</span>
            <Badge variant="secondary">620 pcs</Badge>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <span>Bin A-02-11</span>
            <Badge variant="secondary">410 pcs</Badge>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <span>Bin B-04-07</span>
            <Badge variant="secondary">210 pcs</Badge>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
