import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";

import { DrawerContent } from "@/components/navigation/drawer-content";
import { colors } from "@/lib/theme";
import { getAccessToken } from "@/providers/tokenStore";

/**
 * Authenticated area = grouped Drawer shell. Screens run headerShown:false and
 * render their own <Screen> header (with a hamburger that opens this drawer).
 */
export default function AppGroupLayout() {
  if (!getAccessToken()) return <Redirect href="/login" />;

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerStyle: { backgroundColor: colors.background, width: 300 },
        swipeEdgeWidth: 40,
      }}
    />
  );
}
