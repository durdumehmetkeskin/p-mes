import { Stack } from "expo-router";

import { colors } from "@/lib/theme";

export default function AuditLogsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="[id]" options={{ presentation: "modal" }} />
    </Stack>
  );
}
