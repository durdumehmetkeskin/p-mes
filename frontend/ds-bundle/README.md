# PmesUI (frontend@0.1.0)

This design system is the published frontend React library, bundled as a single
browser global. All 47 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.PmesUI`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.PmesUI.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Accordion } = window.PmesUI;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Accordion />);
```

## Tokens

159 CSS custom properties from frontend. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (39): `--color-red-400`, `--color-red-500`, `--color-green-100`, …
- **spacing** (6): `--tw-space-y-reverse`, `--tw-space-x-reverse`, `--tw-inset-shadow`, …
- **typography** (11): `--font-sans`, `--font-weight-normal`, `--font-weight-medium`, …
- **radius** (2): `--radius-xs`, `--radius`
- **shadow** (7): `--tw-shadow`, `--tw-ring-shadow`, `--tw-ring-offset-shadow`, …
- **other** (94): `--spacing`, `--container-xs`, `--container-sm`, …

## Components

### general
- `Accordion`
- `Alert`
- `AlertDialog`
- `AspectRatio`
- `Avatar`
- `Badge`
- `Breadcrumb`
- `Button`
- `Calendar`
- `Card`
- `Carousel`
- `ChartContainer`
- `Checkbox`
- `Collapsible`
- `Combobox`
- `Command`
- `ContextMenu`
- `Dialog`
- `Drawer`
- `DropdownMenu`
- `Form`
- `HoverCard`
- `Input`
- `InputOTP`
- `Label`
- `Menubar`
- `NavigationMenu`
- `Pagination`
- `Popover`
- `Progress`
- `RadioGroup`
- `ResizablePanelGroup`
- `ScrollArea`
- `Select`
- `Separator`
- `Sheet`
- `Sidebar`
- `Skeleton`
- `Slider`
- `Switch`
- `Table`
- `Tabs`
- `Textarea`
- `Toaster`
- `Toggle`
- `ToggleGroup`
- `Tooltip`
