import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Inbox } from "lucide-react-native";

import { Icon } from "@/components/ui/icon";
import { colors } from "@/lib/theme";

export function EmptyState({
  icon = Inbox,
  title,
  message,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-2 p-8">
      <Icon icon={icon} size={40} color={colors.mutedForeground} strokeWidth={1.5} />
      <Text className="mt-1 font-sans-semibold text-base text-foreground">
        {title}
      </Text>
      {message ? (
        <Text className="text-center text-sm text-muted-foreground">{message}</Text>
      ) : null}
      {action ? <View className="mt-3">{action}</View> : null}
    </View>
  );
}
