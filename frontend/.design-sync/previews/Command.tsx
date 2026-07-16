import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "frontend";
import {
  ArrowRightLeft,
  Boxes,
  FileText,
  PackageMinus,
  PackagePlus,
  Plus,
  Warehouse,
} from "lucide-react";

export function CommandPalette() {
  return (
    <div className="w-[440px] p-6">
      <Command className="rounded-lg border shadow-md">
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem>
              <Plus />
              New work order
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <PackagePlus />
              Receive goods
            </CommandItem>
            <CommandItem>
              <PackageMinus />
              Issue stock
            </CommandItem>
            <CommandItem>
              <ArrowRightLeft />
              Transfer between bins
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigation">
            <CommandItem>
              <Boxes />
              Materials
            </CommandItem>
            <CommandItem>
              <Warehouse />
              Warehouses
            </CommandItem>
            <CommandItem>
              <FileText />
              Reports
              <CommandShortcut>⌘R</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}

export function MaterialSearch() {
  return (
    <div className="w-[440px] p-6">
      <Command className="rounded-lg border shadow-md">
        <CommandInput placeholder="Search materials by name or SKU…" />
        <CommandList>
          <CommandEmpty>No materials found.</CommandEmpty>
          <CommandGroup heading="Materials">
            <CommandItem>
              <Boxes />
              Steel Bracket M-204
              <CommandShortcut>1,240 pcs</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Boxes />
              Hex Bolt M8×40 (A2)
              <CommandShortcut>8,400 pcs</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Boxes />
              Aluminium Sheet 2mm
              <CommandShortcut>96 sheets</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Boxes />
              Copper Wire 1.5mm²
              <CommandShortcut>320 m</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
