import { Stack } from "expo-router";

import { colors } from "@/lib/theme";

export default function LocationsLayout() {
  const modal = { presentation: "modal" as const };
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="create" options={modal} />
      <Stack.Screen name="[id]/edit" options={modal} />
      <Stack.Screen name="[id]/section-new" options={modal} />
    </Stack>
  );
}
