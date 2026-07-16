import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { QuickTabBar } from "@/components/navigation/quick-tab-bar";
import { ScreenHeader } from "@/components/navigation/screen-header";
import { cn } from "@/lib/utils";

/**
 * Standard screen scaffold: top-inset-safe custom header + content area, with
 * an optional persistent bottom quick-tab bar (top-level screens) and optional
 * content padding.
 */
export function Screen({
  title,
  subtitle,
  canGoBack = false,
  headerRight,
  children,
  tabBar = false,
  padded = false,
}: {
  title: string;
  subtitle?: string;
  canGoBack?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
  tabBar?: boolean;
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
      {tabBar ? <QuickTabBar /> : null}
    </View>
  );
}
