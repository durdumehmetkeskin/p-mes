import type { ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: ViewProps & { className?: string; children?: ReactNode }) {
  return (
    <View className={cn("rounded-lg border border-border bg-card", className)} {...props}>
      {children}
    </View>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <View className={cn("gap-1 p-4 pb-2", className)}>{children}</View>;
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Text className={cn("font-sans-semibold text-base text-card-foreground", className)}>
      {children}
    </Text>
  );
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Text className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </Text>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <View className={cn("p-4 pt-2", className)}>{children}</View>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <View className={cn("flex-row items-center gap-2 p-4 pt-2", className)}>
      {children}
    </View>
  );
}
