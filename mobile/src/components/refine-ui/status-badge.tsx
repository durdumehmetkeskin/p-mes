import { Text, View } from "react-native";

import { cn } from "@/lib/utils";

/**
 * Industrial status pill (ported from web). Colour is data: success = running/
 * optimal, warning = attention/idle, error = fault/critical, info = in-progress,
 * neutral = inert.
 */
export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

const badgeTone: Record<StatusTone, string> = {
  success: "border-success/20 bg-success/10",
  warning: "border-warning/25 bg-warning/10",
  error: "border-destructive/25 bg-destructive/10",
  info: "border-info/20 bg-info/10",
  neutral: "border-border bg-muted/40",
};

const textTone: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  info: "text-info",
  neutral: "text-muted-foreground",
};

const dotTone: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

const TONE_BY_STATUS: Record<string, StatusTone> = {
  available: "success",
  in_stock: "success",
  active: "success",
  healthy: "success",
  completed: "success",
  fulfilled: "success",
  passed: "success",
  running: "success",
  ok: "success",
  in_op: "success",
  maintenance: "warning",
  calibration: "warning",
  low_stock: "warning",
  quarantine: "warning",
  pending: "warning",
  waiting: "warning",
  standby: "warning",
  delayed: "warning",
  due: "warning",
  retired: "error",
  critical: "error",
  fault: "error",
  failure: "error",
  offline: "error",
  blocked: "error",
  expired: "error",
  danger: "error",
  error: "error",
  out_of_stock: "error",
  in_use: "info",
  in_progress: "info",
  ready: "info",
  scheduled: "info",
  released: "info",
  draft: "info",
  new: "info",
  assigned: "info",
  ongoing: "info",
  create: "success",
  update: "info",
  delete: "error",
  in: "success",
  out: "error",
  transfer: "info",
  transfer_in: "success",
  transfer_out: "warning",
  adjustment: "neutral",
  handover: "info",
  return: "warning",
  reserving: "info",
  delivering: "info",
  delivered: "success",
  received: "success",
  returning: "warning",
  reserved: "neutral",
  consumed: "neutral",
  inactive: "neutral",
  returned: "neutral",
  idle: "neutral",
  closed: "neutral",
  cancelled: "neutral",
  unknown: "neutral",
};

/** Map a raw status string (any case / spaces / hyphens) to a semantic tone. */
export function statusTone(status?: string | null): StatusTone {
  if (!status) return "neutral";
  const key = status.toLowerCase().replace(/[\s-]+/g, "_");
  return TONE_BY_STATUS[key] ?? "neutral";
}

function humanize(label: string): string {
  return label
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({
  tone,
  label,
  className,
}: {
  tone?: StatusTone;
  label: string;
  pulse?: boolean;
  className?: string;
}) {
  const resolved = tone ?? statusTone(label);
  return (
    <View
      className={cn(
        "flex-row items-center gap-1.5 self-start rounded-md border px-2 py-0.5",
        badgeTone[resolved],
        className,
      )}
    >
      <View className={cn("h-1.5 w-1.5 rounded-full", dotTone[resolved])} />
      <Text className={cn("text-xs font-sans-semibold", textTone[resolved])}>
        {humanize(label)}
      </Text>
    </View>
  );
}
