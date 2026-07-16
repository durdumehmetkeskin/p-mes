import { Stack } from "expo-router";

import { colors } from "@/lib/theme";

export default function ZonesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="create" options={{ presentation: "modal" }} />
      <Stack.Screen name="[id]/edit" options={{ presentation: "modal" }} />
    </Stack>
  );
}
