import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ArrowLeft, Menu } from "lucide-react-native";
import { useNavigation, useRouter } from "expo-router";

import { Icon } from "@/components/ui/icon";
import { colors } from "@/lib/theme";

/**
 * Custom screen header (the Drawer runs headerShown:false so screens own their
 * header). Left button opens the drawer on top-level screens, or goes back on
 * pushed screens.
 */
export function ScreenHeader({
  title,
  subtitle,
  canGoBack = false,
  right,
}: {
  title: string;
  subtitle?: string;
  canGoBack?: boolean;
  right?: ReactNode;
}) {
  const navigation = useNavigation();
  const router = useRouter();

  const onLeft = () => {
    if (canGoBack) {
      if (router.canGoBack()) router.back();
      return;
    }
    // Open the drawer without importing @react-navigation (banned in SDK 56+).
    const nav = navigation as unknown as {
      openDrawer?: () => void;
      getParent?: () => { openDrawer?: () => void } | undefined;
    };
    if (typeof nav.openDrawer === "function") nav.openDrawer();
    else nav.getParent?.()?.openDrawer?.();
  };

  return (
    <View className="flex-row items-center gap-1 border-b border-border bg-background px-2 py-2">
      <Pressable
        onPress={onLeft}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
      >
        <Icon icon={canGoBack ? ArrowLeft : Menu} color={colors.foreground} />
      </Pressable>
      <View className="flex-1 px-1">
        <Text
          numberOfLines={1}
          className="font-sans-semibold text-base text-foreground"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="flex-row items-center">{right}</View> : null}
    </View>
  );
}
