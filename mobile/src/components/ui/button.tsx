import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, type PressableProps, Text } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";

const buttonVariants = cva(
  "flex-row items-center justify-center gap-2 rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary active:opacity-90",
        secondary: "bg-secondary active:opacity-90",
        outline: "border border-input bg-transparent active:bg-accent",
        ghost: "bg-transparent active:bg-accent",
        destructive: "bg-destructive active:opacity-90",
      },
      size: {
        sm: "h-9 px-3",
        default: "h-11 px-4",
        lg: "h-12 px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva("font-sans-semibold text-sm", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      outline: "text-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface ButtonProps
  extends Omit<PressableProps, "children">,
    VariantProps<typeof buttonVariants> {
  label?: string;
  loading?: boolean;
  leftIcon?: ReactNode;
  className?: string;
  textClassName?: string;
  children?: ReactNode;
}

export function Button({
  variant,
  size,
  label,
  loading,
  disabled,
  leftIcon,
  className,
  textClassName,
  children,
  ...props
}: ButtonProps) {
  const off = disabled || loading;
  const spinnerColor =
    variant === "default"
      ? colors.primaryForeground
      : variant === "destructive"
        ? colors.destructiveForeground
        : colors.foreground;

  return (
    <Pressable
      disabled={off}
      className={cn(buttonVariants({ variant, size }), off && "opacity-50", className)}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        leftIcon
      )}
      {label ? (
        <Text className={cn(buttonTextVariants({ variant }), textClassName)}>
          {label}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
