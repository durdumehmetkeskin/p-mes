import { memo, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useCan } from "@refinedev/core";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";
import { QUICK_TABS, type NavItem } from "@/lib/nav";

function isActive(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

const QuickTab = memo(function QuickTab({ tab }: { tab: NavItem }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useMemo(
    () => ({ resource: { name: tab.resource ?? "" } }),
    [tab.resource],
  );
  const { data } = useCan({ resource: tab.resource, action: "list", params });
  if (tab.resource && data?.can === false) return null;

  const active = isActive(pathname, tab.route);
  return (
    <Pressable
      onPress={() => router.push(tab.route)}
      className="flex-1 items-center justify-center gap-0.5 py-1.5"
    >
      <Icon
        icon={tab.icon}
        size={20}
        color={active ? colors.primary : colors.mutedForeground}
      />
      <Text
        className={cn(
          "text-[10px]",
          active
            ? "font-sans-medium text-primary"
            : "text-muted-foreground",
        )}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
});

/** Persistent bottom quick-nav bar (Dashboard / Materials / Tools / Scan). */
export function QuickTabBar() {
  return (
    <SafeAreaView edges={["bottom"]} className="border-t border-border bg-card">
      <View className="flex-row">
        {QUICK_TABS.map((tab) => (
          <QuickTab key={tab.label} tab={tab} />
        ))}
      </View>
    </SafeAreaView>
  );
}
