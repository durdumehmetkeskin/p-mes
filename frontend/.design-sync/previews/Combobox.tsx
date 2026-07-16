import {
  Button,
  Combobox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "frontend";
import { Check, ChevronsUpDown } from "lucide-react";

const MATERIALS = [
  { value: "mat-1042", label: "Steel Bracket M-204" },
  { value: "mat-2210", label: "Hex Bolt M8×40 (A2)" },
  { value: "mat-3087", label: "Aluminium Sheet 2mm" },
  { value: "mat-4419", label: "Nylon Bushing 12mm" },
  { value: "mat-5560", label: "Copper Wire 1.5mm²" },
];

export function MaterialPicker() {
  return (
    <div className="w-72 p-6">
      <Combobox
        options={MATERIALS}
        value="mat-1042"
        onChange={() => {}}
        placeholder="Select material…"
        searchPlaceholder="Search materials…"
      />
    </div>
  );
}

export function EmptyPicker() {
  return (
    <div className="w-72 p-6">
      <Combobox
        options={MATERIALS}
        value=""
        onChange={() => {}}
        placeholder="Select material…"
        searchPlaceholder="Search materials…"
      />
    </div>
  );
}

export function SearchableMaterialList() {
  return (
    <div className="p-6">
      <Popover open>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded
            className="w-64 justify-between font-normal"
          >
            <span className="truncate">Steel Bracket M-204</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Search materials…" />
            <CommandList>
              <CommandEmpty>No material found.</CommandEmpty>
              <CommandGroup>
                {MATERIALS.map((m) => (
                  <CommandItem key={m.value} value={m.value}>
                    <Check
                      className={
                        m.value === "mat-1042"
                          ? "mr-2 h-4 w-4 opacity-100"
                          : "mr-2 h-4 w-4 opacity-0"
                      }
                    />
                    <span className="truncate">{m.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
