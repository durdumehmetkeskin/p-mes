import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { cn } from "@/lib/utils";

/** Label/value row for detail screens. Pass `children` to render a custom value
 *  (badge, link, etc.) instead of plain text. */
export function FieldRow({
  label,
  value,
  children,
  mono = false,
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  mono?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <View className="flex-1 items-end">
        {children ?? (
          <Text
            className={cn(
              "text-right text-sm text-foreground",
              mono && "font-mono",
            )}
          >
            {value != null && value !== "" ? value : "—"}
          </Text>
        )}
      </View>
    </View>
  );
}

/** Small caps section heading. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="mb-1 text-[11px] font-sans-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </Text>
  );
}
