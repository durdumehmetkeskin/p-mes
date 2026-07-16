# Batch D learnings

Components: Accordion, Collapsible, Tabs, Breadcrumb, Pagination, NavigationMenu, Sheet, Drawer, AlertDialog

## Overlays / floating panels — need `cardMode: single` + a viewport override (like Dialog)
These render into a portal with a fixed full-screen overlay + edge/centered panel. In the default grid cardMode the framing is wrong. Author them OPEN; orchestrator should add config overrides:
- **Sheet** (`Sheet open`) — side panel, `fixed inset-y-0` right/left, `w-3/4 sm:max-w-sm`. Exports: `EditMaterial` (right), `FilterPanel` (left). Suggest `cardMode: single`, tall/wide viewport (e.g. 900x600), primaryStory `EditMaterial`.
- **Drawer** (`Drawer open`, vaul) — bottom sheet, `fixed inset-x-0 bottom-0 max-h-[80vh]`. Export: `GoodsReceipt`. Suggest `cardMode: single`, viewport ~760x560.
- **AlertDialog** (`AlertDialog open`) — centered modal + dark overlay, like Dialog. Exports: `DeleteWarehouse`, `DiscardChanges`. Suggest same override as Dialog (`cardMode: single`, `viewport: 680x460`).

## Open floating panel
- **NavigationMenu** `InventoryMenu` renders the menu OPEN (Root `defaultValue="inventory"`); content shows in an `absolute top-full` viewport below the bar — needs vertical headroom. Gave it `min-h-[300px]`. If clipped in grid mode, treat as an open panel needing `cardMode: single` + tall viewport.

## Wide (horizontal bar) — may want a wide card
- **NavigationMenu** `TopBar` — full-width horizontal nav bar (`viewport={false}`, ~640px). Wide.
- **Pagination** `MaterialsPage` / `FirstPage` — horizontal Previous/pages/Next row, up to ~xl width. Wide-ish.
- **Breadcrumb** — single horizontal row; fine in normal card.

## Non-overlay, render normally
Accordion, Collapsible, Tabs, Breadcrumb, Pagination render inline — no config change needed.

## Notes
- Collapsible primitive ships unstyled; wrapped trigger in `Button variant="ghost"` (asChild) + bordered content so it reads as a real filter/breakdown panel.
- AlertDialogAction destructive styling done via `AlertDialogAction asChild` wrapping `<Button variant="destructive">` (avoids needing `cn`/`buttonVariants` imports which aren't in the "frontend" package surface).
