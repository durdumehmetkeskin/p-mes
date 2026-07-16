# Batch B learnings (data display & layout)

Components: Badge, Avatar, Alert, Separator, Skeleton, AspectRatio, Progress, ScrollArea, Table

## cardMode / layout hints for orchestrator
- **Table** (MaterialsTable, WorkOrdersTable): WIDE — 4 columns + badges. Needs a wide/column card mode so it doesn't wrap/clip.
- **ScrollArea** (BinLocations, MaterialList): fixed-height scroll region (h-56/h-64). Not wide; renders inline. Scrollbar only appears on hover/overflow — content itself is complete.
- None of my components are open/floating/overlay panels — all render inline, no Provider needed.

## Notes / risks
- Avatar: no network in capture env, so AvatarImage src likely fails to load → Radix shows AvatarFallback initials (expected, still complete/plausible).
- Alert/AspectRatio/Progress/ScrollArea are not referenced in src/pages (only UI defs). If their utility/arbitrary classes are missing from compiled CSS, note here after capture.

## Iterations
(to be filled after capture/grade)
