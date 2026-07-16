---
name: Precision Industrial System
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#b7c8e1'
  on-secondary: '#213145'
  secondary-container: '#3a4a5f'
  on-secondary-container: '#a9bad3'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  sidebar-width-global: 64px
  sidebar-width-workspace: 240px
  row-height-dense: 32px
  row-height-standard: 48px
---

## Brand & Style

This design system is engineered for the high-stakes environment of modern manufacturing. The brand personality is **Reliable, Efficient, Technical, and Transparent**, prioritizing information density and split-second legibility over decorative flair.

The visual direction follows a **Modern Industrial** aesthetic—a hybrid of professional SaaS clarity and rugged technical instrumentation. It utilizes a structured, "Shadcn-inspired" framework characterized by:
- **High Information Density:** Maximum data visibility with minimal vertical scrolling.
- **Functional Minimalism:** Every stroke, color, and shadow serves a diagnostic purpose.
- **Technical Rigor:** Strict alignment to a grid, ensuring that complex dashboards remain interpretable under pressure.
- **Dual-Context Utility:** Optimized for both the high-glare environment of a factory floor (Light Mode) and the low-light focus of a centralized Control Room (Dark Mode).

## Colors

The palette is rooted in deep slate and charcoal to reduce eye strain during long shifts. 

- **Foundations:** Use `#0f172a` for primary backgrounds and `#1e293b` for elevated containers or sidebars.
- **Action Blue (#3b82f6):** Reserved strictly for primary interactive elements like "Start Batch" or "Submit Report."
- **Functional Signals:** Color is used as data. **Success Green** indicates "Running/Optimal," **Warning Amber** for "Maintenance Required/Idle," and **Danger Red** for "Emergency Stop/Critical Failure."
- **Contrast:** Ensure a minimum 4.5:1 contrast ratio for all status-indicating text against its background. In Dark Mode ("Control Room"), use slightly desaturated versions of functional colors to prevent "vibrating" edges on high-brightness displays.

## Typography

The system utilizes **Inter** for its neutral, highly legible glyphs and **JetBrains Mono** for technical data points.

- **Data Legibility:** All numeric values in tables, sensor readouts, and timestamps must use `data-mono` to ensure tabular alignment (monospaced) for easy scanning of fluctuating values.
- **Hierarchy:** Use `label-caps` for table headers and section overlines to differentiate metadata from actionable content.
- **Mobile Adaptation:** Headlines scale down by 15% on mobile devices, while body text remains at 14px to maintain accessibility for operators wearing protective gear.

## Layout & Spacing

The system uses a **fixed-fluid hybrid grid** designed for complex dashboards.

- **Dual-Sidebar Navigation:** 
    - **Global Sidebar (64px):** Icons-only for switching between high-level apps (Dashboard, Inventory, Maintenance).
    - **Workspace Sidebar (240px):** Contextual tree navigation or filtered views for the active project.
- **Data Density:** Layouts should maximize the "Fold" on 1080p displays. Use `row-height-dense` for large data tables to allow 20+ rows without scrolling.
- **Breakpoints:**
    - **Desktop (1440px+):** Full dual-sidebar visibility.
    - **Tablet (768px - 1439px):** Workspace sidebar collapses into a drawer; Global sidebar persists.
    - **Mobile (<767px):** Single column layout with simplified data "cards" replacing complex tables.

## Elevation & Depth

To maintain a "technical tool" feel, this design system avoids heavy shadows in favor of **Tonal Layering and Borders**.

- **Surface Levels:** 
    - **Level 0 (Background):** `#0f172a` (The base canvas).
    - **Level 1 (Cards/Panels):** `#1e293b` with a 1px border of `#334155`.
    - **Level 2 (Popovers/Modals):** `#1e293b` with a subtle 4px blur shadow (0 4px 6px -1px rgba(0,0,0,0.3)) to provide focus.
- **Borders:** Use thin, 1px solid borders to define regions. In Dark Mode, borders should be low-contrast (Slate-700/800) to avoid visual noise.
- **Interactive States:** Use a subtle inner-glow or a change in border-color (to Primary Action Blue) to indicate focus or selection.

## Shapes

The shape language is **Soft (0.25rem)**, providing a modern feel while retaining the structural rigidity required of an industrial tool.

- **Standard Elements:** Buttons, input fields, and tags use a 4px (0.25rem) radius.
- **Large Containers:** Dashboard widgets and main content panels use a 8px (0.5rem) radius.
- **Status Indicators:** Use perfect circles for status dots (e.g., machine health) to contrast against the predominantly rectangular UI.

## Components

- **Data Tables:** The core of the system. Use sticky headers, zebra-striping (subtle), and monospaced font for numerical columns. Include a "Density Toggle" to switch between compact and comfortable views.
- **Status Badges:** Small, high-contrast labels with a background tint and a foreground dot. (e.g., "Active" uses a light green bg with a dark green dot).
- **Control Buttons:** 
    - **Primary:** Solid Action Blue.
    - **Secondary:** Ghost/Outline style to prevent visual competition.
    - **Destructive:** Solid Danger Red (reserved for "Stop" or "Delete" actions).
- **Progress Trackers:** Linear horizontal steps for manufacturing stages. Active steps use a glowing blue line; completed steps use a checkmark icon.
- **Input Fields:** Flat, dark background with a 1px border. On focus, the border transitions to Action Blue with a subtle 2px outer glow.
- **KPI Cards:** Large-format typography for metrics (e.g., "OEE: 84%") with a small sparkline trend chart integrated into the background or bottom of the card.