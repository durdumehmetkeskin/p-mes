import { Stack } from "expo-router";

import { colors } from "@/lib/theme";

export default function ReportsLayout() {
  const modal = { presentation: "modal" as const };
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="templates/create" options={modal} />
      <Stack.Screen name="templates/[id]/edit" options={modal} />
    </Stack>
  );
}
