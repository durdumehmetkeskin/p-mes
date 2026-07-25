import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/navigation/screen-header";
import { cn } from "@/lib/utils";

/**
 * Standard screen scaffold: top-inset-safe custom header + content area with
 * optional padding. The bottom quick-tab bar is NOT rendered here — it lives
 * once in the (app) group layout, fixed under every screen.
 */
export function Screen({
  title,
  subtitle,
  canGoBack = false,
  headerRight,
  children,
  padded = false,
}: {
  title: string;
  subtitle?: string;
  canGoBack?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <ScreenHeader
          title={title}
          subtitle={subtitle}
          canGoBack={canGoBack}
          right={headerRight}
        />
      </SafeAreaView>
      <View className={cn("flex-1", padded && "p-4")}>{children}</View>
    </View>
  );
}
