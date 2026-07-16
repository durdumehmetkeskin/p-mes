# Batch C learnings — overlays / menus

Assigned: DropdownMenu, ContextMenu, Popover, HoverCard, Tooltip, Menubar, Select, Combobox, Command

## cardMode guidance for the orchestrator

These render a **floating/portaled overlay panel** (rendered with `open`) — set
`cardMode: single` with a viewport so the portal isn't clipped:

- **Select** — SelectContent portals below the trigger. viewport ~ 420x360.
- **DropdownMenu** — DropdownMenuContent portals. Second cell (ColumnVisibility)
  is taller (checkbox list + radio group). viewport ~ 420x420.
- **Popover** — PopoverContent portals; content is a small form panel. viewport ~ 460x420.
- **HoverCard** — HoverCardContent portals. viewport ~ 420x300.
- **Tooltip** — TooltipContent portals (small dark bubble). Used extra `p-10`
  padding so the bubble + arrow aren't cropped. viewport ~ 380x220.
- **Combobox** — the `SearchableMaterialList` cell is an OPEN Popover+Command
  panel (overlay). The other two cells (MaterialPicker / EmptyPicker) are the
  real `<Combobox>` in its **closed** resting state = just a trigger button.
  viewport ~ 420x360 covers the open cell.

**Wide, not overlay:**
- **Menubar** — a wide horizontal bar (~560px). `AppMenubar` is the closed bar;
  `OpenFileMenu` forces one menu open via `<Menubar defaultValue="file">` +
  `<MenubarMenu value="file">`, so it also drops a portaled content panel. Needs
  width ≥ 600 and some height for the open menu. viewport ~ 620x320.

**Inline (no portal), just needs width:**
- **Command** — renders inline (cmdk, no portal). Wrapped in a `w-[440px]`
  bordered container. Not an overlay; a normal card sized to content works.

## Component-specific notes

- **ContextMenu** — Radix ContextMenu.Root exposes **no `open`/`defaultOpen`**
  prop; it only opens on a real right-click at the pointer position. It cannot
  be forced open in a static capture. The preview (`MaterialRowMenu`) therefore
  renders the **trigger target** (a labeled dashed drop-zone) with the full
  ContextMenuContent composed but not visible statically. Graded on the trigger
  cell. The menu panel needs runtime interaction to show — not a config issue.

- **Combobox** — the exported `<Combobox>` manages its Popover `open` in
  internal `useState(false)` and exposes **no `open` prop**, so its dropdown
  list can't be forced open statically. To still preview the open searchable
  list I added `SearchableMaterialList`, which composes the same DS primitives
  the Combobox uses internally (Popover `open` + Command + CommandInput/List/
  Item) — a faithful open-combobox render. `MaterialPicker`/`EmptyPicker` show
  the real component's closed trigger (selected value vs. placeholder).

- **Tooltip** — the DS `Tooltip` already wraps its own `TooltipProvider`
  internally, but I still wrap in `TooltipProvider` per the guide (nested
  providers are harmless). Forced open with `<Tooltip open>`.

- **Menubar** — `defaultValue` on the Root + matching `value` on a MenubarMenu
  is the way to force one submenu open (Radix roving value model).

## CSS / missing classes
None observed at authoring time. Will note here if any cell captures unstyled.
