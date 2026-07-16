import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { Link } from "react-router";

import { cn } from "@/lib/utils";

/**
 * Control-room KPI tile: a `label-caps` overline, a large (optionally mono) value,
 * an optional hint/trend line, an accent icon, and a bottom accent bar.
 * Used across the dashboard, tooling console and project workspace KPI strips.
 */
export type KpiTone =
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

const toneText: Record<KpiTone, string> = {
  primary: "text-primary",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  neutral: "text-muted-foreground",
};

const toneBar: Record<KpiTone, string> = {
  primary: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-border",
};

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  /** Colours the icon, hint and accent bar. */
  tone?: KpiTone;
  /** Colours the value too (defaults to foreground). */
  valueTone?: KpiTone;
  /** Small line under the value (e.g. a trend or breakdown). */
  hint?: React.ReactNode;
  hintIcon?: LucideIcon;
  /** Render the value in JetBrains Mono (for durations/timestamps/counts). */
  mono?: boolean;
  /** 0–100 fill of the bottom accent bar; when omitted the bar is a static tint. */
  progress?: number;
  /** Turn the whole tile into a link. */
  to?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  valueTone,
  hint,
  hintIcon: HintIcon,
  mono = false,
  progress,
  to,
  className,
}: KpiCardProps) {
  const content = (
    <div
      className={cn(
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-lg border bg-card p-4",
        to && "transition-colors hover:border-primary/50 hover:bg-accent/40",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon ? <Icon className={cn("size-4 shrink-0", toneText[tone])} /> : null}
      </div>

      <div className="mt-2">
        <div
          className={cn(
            "text-3xl font-bold leading-none",
            mono && "font-mono",
            valueTone ? toneText[valueTone] : "text-foreground",
          )}
        >
          {value}
        </div>
        {hint ? (
          <div
            className={cn(
              "mt-1.5 flex items-center gap-1 text-[11px] font-medium",
              toneText[tone],
            )}
          >
            {HintIcon ? <HintIcon className="size-3.5 shrink-0" /> : null}
            <span>{hint}</span>
          </div>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1 bg-border/40">
        <div
          className={cn("h-full", toneBar[tone])}
          style={{ width: progress != null ? `${Math.min(Math.max(progress, 0), 100)}%` : "100%" }}
        />
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

KpiCard.displayName = "KpiCard";
