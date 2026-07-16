import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";

export function Checkbox({
  checked,
  onPress,
  label,
  disabled,
}: {
  checked: boolean;
  onPress: () => void;
  label?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center gap-3 py-1.5",
        disabled && "opacity-50",
      )}
    >
      <View
        className={cn(
          "h-5 w-5 items-center justify-center rounded border",
          checked ? "border-primary bg-primary" : "border-input",
        )}
      >
        {checked ? (
          <Icon icon={Check} size={14} color={colors.primaryForeground} />
        ) : null}
      </View>
      {typeof label === "string" ? (
        <Text className="flex-1 text-sm text-foreground">{label}</Text>
      ) : (
        label
      )}
    </Pressable>
  );
}
