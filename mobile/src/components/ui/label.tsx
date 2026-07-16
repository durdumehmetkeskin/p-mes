import type { ReactNode } from "react";
import { Text } from "react-native";

import { cn } from "@/lib/utils";

export function Label({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Text className={cn("font-sans-medium text-sm text-foreground", className)}>
      {children}
    </Text>
  );
}
