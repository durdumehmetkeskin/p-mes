import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { View } from "react-native";

import { DrawerContent } from "@/components/navigation/drawer-content";
import { QuickTabBar } from "@/components/navigation/quick-tab-bar";
import { colors } from "@/lib/theme";
import { getAccessToken } from "@/providers/tokenStore";

/**
 * Authenticated area = grouped Drawer shell. Screens run headerShown:false and
 * render their own <Screen> header (with a hamburger that opens this drawer).
 * The bottom quick-tab bar lives HERE — below the navigator — so it is fixed
 * and identical on every screen (lists, details, modals alike).
 */
export default function AppGroupLayout() {
  if (!getAccessToken()) return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <Drawer
          drawerContent={(props) => <DrawerContent {...props} />}
          screenOptions={{
            headerShown: false,
            drawerType: "front",
            drawerStyle: { backgroundColor: colors.background, width: 300 },
            swipeEdgeWidth: 40,
          }}
        />
      </View>
      <QuickTabBar />
    </View>
  );
}
