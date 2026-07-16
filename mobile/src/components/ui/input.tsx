import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";

import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";

export const Input = forwardRef<
  TextInput,
  TextInputProps & { className?: string }
>(function Input({ className, ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.mutedForeground}
      className={cn(
        "rounded-md border border-input bg-card px-3 py-2.5 text-base text-foreground",
        className,
      )}
      {...props}
    />
  );
});
