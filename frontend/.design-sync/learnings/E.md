# Batch E learnings — Calendar, Carousel, ChartContainer, Form, Sidebar, InputOTP, ResizablePanelGroup, Toaster

## cardMode / viewport hints for the orchestrator
- **Sidebar** — WIDE + TALL. Renders a full nav rail (16rem wide). Uses `SidebarProvider` (required, provides context + TooltipProvider). `SidebarProvider` forces `min-h-svh`; I override it with `min-h-0` + a fixed `h-[440px]` via className (works because `cn` = twMerge). Use `collapsible="none"` so it renders inline instead of as a fixed/offcanvas or mobile Sheet. Suggest `cardMode: single`, tall viewport (e.g. 360x520 or column).
- **ChartContainer** — WIDE. recharts BarChart, needs explicit height (`h-[220px] w-full`). Suggest wide viewport / `cardMode: single`.
- **Carousel** — WIDE-ish + needs explicit width AND item height. `CarouselPrevious/Next` are absolutely positioned at `-left-12` / `-right-12`, so they OVERFLOW the carousel box — the card needs horizontal padding (`px-12`) or the arrows clip. Items collapse without an explicit height, so each item is a fixed-height Card. Suggest `cardMode: single` with side padding.
- **Form** — normal width (max-w-md). No special handling.
- **Calendar** — renders a month inline, styled out of the box (react-day-picker v8, `classNames` API). Normal card.
- **InputOTP** — normal width. Controlled via `value`; pass a no-op `onChange` to avoid React controlled-input warning.
- **ResizablePanelGroup** — needs explicit height (`h-[220px]`). Renders inline fine.

## Toaster (sonner) — CANNOT render statically
- `Toaster` is the sonner `<Toaster/>` notification REGION. Toasts are imperative (`toast(...)`), fired at runtime — a static capture shows an EMPTY region (an empty `<ol>`), so there is nothing visible to grade.
- Did NOT fake a toast with hand markup (that would be reimplementation, disallowed). Authored a single honest `<Toaster />` export.
- Graded `needs-work` — this is a genuine limitation, not a fixable composition. Ships as a floor card. `useTheme` from next-themes is called inside; it does NOT throw without a provider (defaults to "system").

## Notes
- All deps present in node_modules: recharts ^2.15, embla-carousel-react ^8.6, react-hook-form ^7.57, react-day-picker 8.10.1, input-otp ^1.4, react-resizable-panels ^2.1, sonner ^2, date-fns ^4, next-themes ^0.4.
- Domain content pulled from real forms: material SKU (e.g. STEEL-001), MATERIAL_UNITS enum (piece/kg/g/l/m/box/pallet), warehouse codes (WH-01), goods receipt/issue movements.
