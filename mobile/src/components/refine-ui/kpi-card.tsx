import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useRouter } from "expo-router";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";

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

const toneHex: Record<KpiTone, string> = {
  primary: colors.primary,
  info: colors.info,
  success: colors.success,
  warning: colors.warning,
  danger: colors.destructive,
  neutral: colors.mutedForeground,
};

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: KpiTone;
  valueTone?: KpiTone;
  hint?: ReactNode;
  hintIcon?: LucideIcon;
  mono?: boolean;
  progress?: number;
  to?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  tone = "primary",
  valueTone,
  hint,
  hintIcon,
  mono = false,
  progress,
  to,
  className,
}: KpiCardProps) {
  const router = useRouter();

  const body = (
    <View
      className={cn(
        "relative min-h-[92px] justify-between overflow-hidden rounded-lg border border-border bg-card p-4",
        className,
      )}
    >
      <View className="flex-row items-start justify-between">
        <Text className="text-[11px] font-sans-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </Text>
        {icon ? <Icon icon={icon} size={16} color={toneHex[tone]} /> : null}
      </View>

      <View className="mt-2">
        {typeof value === "string" || typeof value === "number" ? (
          <Text
            className={cn(
              "text-3xl font-sans-bold leading-none",
              mono && "font-mono",
              valueTone ? toneText[valueTone] : "text-foreground",
            )}
          >
            {value}
          </Text>
        ) : (
          value
        )}
        {hint ? (
          <View className="mt-1.5 flex-row items-center gap-1">
            {hintIcon ? (
              <Icon icon={hintIcon} size={13} color={toneHex[tone]} />
            ) : null}
            <Text className={cn("text-[11px] font-sans-medium", toneText[tone])}>
              {hint}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="absolute inset-x-0 bottom-0 h-1 bg-border/40">
        <View
          className={cn("h-full", toneBar[tone])}
          style={{
            width:
              progress != null
                ? `${Math.min(Math.max(progress, 0), 100)}%`
                : "100%",
          }}
        />
      </View>
    </View>
  );

  if (to) {
    return <Pressable onPress={() => router.push(to)}>{body}</Pressable>;
  }
  return body;
}
