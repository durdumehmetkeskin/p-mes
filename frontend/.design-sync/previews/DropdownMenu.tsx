import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "frontend";
import {
  Copy,
  History,
  MoreHorizontal,
  Pencil,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

export function RowActions() {
  return (
    <div className="p-6">
      <DropdownMenu open>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Steel Bracket M-204</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Pencil />
            Edit material
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem>
            <History />
            View stock history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>
            Show archived lots
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ColumnVisibility() {
  return (
    <div className="p-6">
      <DropdownMenu open>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <SlidersHorizontal />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>SKU</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked>
            On-hand qty
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked>Reserved</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>Bin location</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup value="sku">
            <DropdownMenuRadioItem value="sku">SKU</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="qty">
              On-hand quantity
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="updated">
              Last updated
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
