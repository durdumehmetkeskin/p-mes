import { Stack } from "expo-router";

import { colors } from "@/lib/theme";

export default function ProjectsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="create" options={{ presentation: "modal" }} />
    </Stack>
  );
}
