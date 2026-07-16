import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Industrial status pill: a tinted badge with a leading status dot.
 * Colour is data — success = running/optimal, warning = attention/idle,
 * error = fault/critical, info = in-progress/neutral-active, neutral = inert.
 * Replaces the per-page `Record<status, BadgeVariant>` maps scattered across lists.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold w-fit whitespace-nowrap capitalize",
  {
    variants: {
      tone: {
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warning/25 bg-warning/10 text-warning",
        error: "border-destructive/25 bg-destructive/10 text-destructive",
        info: "border-info/20 bg-info/10 text-info",
        neutral: "border-border bg-muted/40 text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type StatusTone = NonNullable<
  VariantProps<typeof statusBadgeVariants>["tone"]
>;

const dotClass: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

const TONE_BY_STATUS: Record<string, StatusTone> = {
  // running / optimal / done
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
  // attention / idle / pending
  maintenance: "warning",
  calibration: "warning",
  low_stock: "warning",
  quarantine: "warning",
  pending: "warning",
  waiting: "warning",
  standby: "warning",
  delayed: "warning",
  due: "warning",
  // fault / critical / terminal
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
  canceled: "error",
  // in-progress / neutral-active
  in_use: "info",
  in_progress: "info",
  ready: "info",
  scheduled: "info",
  released: "info",
  draft: "info",
  new: "info",
  assigned: "info",
  ongoing: "info",
  // audit-log actions
  create: "success",
  update: "info",
  delete: "error",
  // inventory movement types
  in: "success",
  out: "error",
  transfer: "info",
  transfer_in: "success",
  transfer_out: "warning",
  adjustment: "neutral",
  handover: "info",
  return: "warning",
  // in-progress
  reserving: "info",
  delivering: "info",
  delivered: "success",
  received: "success",
  returning: "warning",
  // inert
  reserved: "neutral",
  consumed: "neutral",
  inactive: "neutral",
  passive: "neutral",
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

export interface StatusBadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof statusBadgeVariants> {
  /** Explicit tone; when omitted it is derived from `label` via `statusTone`. */
  tone?: StatusTone;
  /** Visible text; also used to derive the tone when `tone` is not given. */
  label: string;
  /** Pulse the dot (use for live-critical states). */
  pulse?: boolean;
}

export function StatusBadge({
  tone,
  label,
  pulse = false,
  className,
  ...props
}: StatusBadgeProps) {
  const resolved = tone ?? statusTone(label);
  return (
    <span
      className={cn(statusBadgeVariants({ tone: resolved }), className)}
      {...props}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          dotClass[resolved],
          pulse && "animate-pulse",
        )}
      />
      {label}
    </span>
  );
}

StatusBadge.displayName = "StatusBadge";
