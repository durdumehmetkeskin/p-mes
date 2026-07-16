import { memo, useCallback, useMemo } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useGetIdentity, useList, useLogout } from "@refinedev/core";
import type { DrawerContentComponentProps } from "expo-router/drawer";
import { LogOut, X } from "lucide-react-native";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";
import { NAV_GROUPS, NAV_TOP, type NavItem } from "@/lib/nav";
import { useAccessState } from "@/hooks/use-access-state";
import { canAccessResource } from "@/providers/access-control";

interface Identity {
  name?: string;
  email?: string;
}

function isActive(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

const DrawerNavItem = memo(function DrawerNavItem({
  item,
  onNavigate,
  badge = 0,
}: {
  item: NavItem;
  onNavigate: (route: string) => void;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item.route);
  return (
    <Pressable
      onPress={() => onNavigate(item.route)}
      className={cn(
        "mx-2 mb-0.5 flex-row items-center gap-3 rounded-md px-3 py-2.5",
        active && "bg-sidebar-primary",
      )}
    >
      <Icon
        icon={item.icon}
        size={18}
        color={active ? colors.primary : colors.mutedForeground}
      />
      <Text
        className={cn(
          "flex-1 text-sm",
          active
            ? "font-sans-semibold text-sidebar-accent-foreground"
            : "text-sidebar-foreground",
        )}
      >
        {item.label}
      </Text>
      {badge > 0 ? (
        <View
          className="h-5 min-w-5 items-center justify-center rounded-full px-1.5"
          style={{ backgroundColor: colors.destructive }}
        >
          <Text className="text-[11px] font-sans-semibold text-white">
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

export function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout } = useLogout();

  const { result: unread } = useList({
    resource: "notifications",
    pagination: { pageSize: 1 },
    filters: [{ field: "read", operator: "eq", value: false }],
    queryOptions: { refetchInterval: 30_000, retry: false },
    errorNotification: false,
  });
  const unreadCount = unread?.total ?? 0;

  // Show only entries the user has read access to; drop a group entirely when
  // none of its items are visible (so no empty section headings linger). Until
  // the access state loads, render nothing; on a network error it fails open.
  const { state } = useAccessState();
  const topItems = useMemo(
    () =>
      state ? NAV_TOP.filter((i) => canAccessResource(state, i.resource)) : [],
    [state],
  );
  const groups = useMemo(
    () =>
      state
        ? NAV_GROUPS.map((g) => ({
            ...g,
            items: g.items.filter((i) => canAccessResource(state, i.resource)),
          })).filter((g) => g.items.length > 0)
        : [],
    [state],
  );

  const close = useCallback(
    () => props.navigation.closeDrawer(),
    [props.navigation],
  );

  const go = useCallback(
    (route: string) => {
      // Navigate first, THEN close — closing before navigating can let the
      // route transition cancel the close animation (drawer stays open).
      router.push(route);
      close();
    },
    [router, close],
  );

  return (
    <View className="flex-1 bg-sidebar">
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          <View className="mb-2 flex-row items-start justify-between px-4 pb-3 pt-2">
            <View className="flex-1 flex-row items-center gap-3">
              <Image
                source={require("../../../assets/logo.png")}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
              <View className="flex-1">
                <Text className="font-sans-bold text-lg text-foreground">QUA-MES</Text>
                <Text className="text-xs text-muted-foreground">
                  Manufacturing Execution System
                </Text>
              </View>
            </View>
            <Pressable
              onPress={close}
              hitSlop={8}
              accessibilityLabel="Close menu"
              className="h-9 w-9 items-center justify-center rounded-md active:bg-sidebar-accent"
            >
              <Icon icon={X} size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {topItems.map((item) => (
            <DrawerNavItem
              key={item.route}
              item={item}
              onNavigate={go}
              badge={item.route === "/notifications" ? unreadCount : 0}
            />
          ))}

          {groups.map((group) => (
            <View key={group.key} className="mt-3">
              <Text className="mb-1 px-4 text-[11px] font-sans-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </Text>
              {group.items.map((item) => (
                <DrawerNavItem key={item.route} item={item} onNavigate={go} />
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} className="border-t border-sidebar-border">
        <View className="p-3">
          <View className="mb-2 px-1">
            <Text
              className="font-sans-medium text-sm text-sidebar-foreground"
              numberOfLines={1}
            >
              {identity?.name ?? "…"}
            </Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {identity?.email ?? ""}
            </Text>
          </View>
          <Pressable
            onPress={() => logout()}
            className="flex-row items-center gap-3 rounded-md px-3 py-2.5 active:bg-sidebar-accent"
          >
            <Icon icon={LogOut} size={18} color={colors.mutedForeground} />
            <Text className="text-sm text-sidebar-foreground">Sign out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
