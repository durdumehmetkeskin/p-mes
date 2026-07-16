/**
 * JS-side color tokens for the dark-only "Precision Industrial System" theme.
 * Mirrors tailwind.config.js — use these where a raw hex is required (SVG
 * icons, native component props like placeholderTextColor / tintColor /
 * ActivityIndicator, navigator screenOptions). For layout/styling prefer
 * NativeWind classes (bg-*, text-*, border-*).
 */
export const colors = {
  background: "#0b1326",
  foreground: "#dae2fd",
  card: "#171f33",
  cardForeground: "#dae2fd",
  popover: "#222a3d",
  popoverForeground: "#dae2fd",
  primary: "#adc6ff",
  primaryForeground: "#002e6a",
  secondary: "#3a4a5f",
  secondaryForeground: "#dae2fd",
  muted: "#222a3d",
  mutedForeground: "#9ba1b4",
  accent: "#2d3449",
  accentForeground: "#dae2fd",
  destructive: "#d64b47",
  destructiveForeground: "#fef2f2",
  border: "#2a3247",
  input: "#424754",
  ring: "#adc6ff",
  success: "#34d399",
  successForeground: "#06281c",
  warning: "#ffb786",
  warningForeground: "#502400",
  info: "#adc6ff",
  infoForeground: "#002e6a",
  chart1: "#adc6ff",
  chart2: "#34d399",
  chart3: "#ffb786",
  chart4: "#b7c8e1",
  chart5: "#ffb4ab",
} as const;

export type ColorToken = keyof typeof colors;
