import type { LucideIcon } from "lucide-react-native";

import { colors } from "@/lib/theme";

/**
 * Thin wrapper around lucide-react-native icons so callers pass a semantic
 * theme color token instead of a raw hex. (RN SVG icons don't inherit color
 * from a parent View, so color must be explicit.)
 */
export function Icon({
  icon: LucideComp,
  size = 20,
  color = colors.foreground,
  strokeWidth = 2,
}: {
  icon: LucideIcon;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return <LucideComp size={size} color={color} strokeWidth={strokeWidth} />;
}
