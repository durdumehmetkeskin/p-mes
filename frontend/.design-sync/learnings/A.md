# Batch A learnings — form controls

Components: Input, Textarea, Label, Checkbox, Switch, RadioGroup, Slider, Toggle, ToggleGroup.

## Rendering mode
- ALL nine render **inline** (no overlays, no floating panels, no Provider needed). Default `cardMode` is fine for every one.
- None are unusually wide. Slider is `w-full`, so each Slider cell is wrapped in a fixed-width container (`w-80`) — without a width constraint it would stretch to the card edge.

## Composition notes
- `Label` is thin on its own; authored composed with Input/Checkbox/Switch (its real usage). Real app pairs `<Switch id>` + `<Label htmlFor>` in `material-form-fields.tsx`.
- Toggle "on" state shown with `defaultPressed`; ToggleGroup selection shown with `defaultValue` (single) / `defaultValue={[...]}` (multiple).
- Slider single = `defaultValue={[n]}`, range = `defaultValue={[a,b]}`.

## Missing classes / issues
- (none observed yet — will note here if a utility renders unstyled in capture)
