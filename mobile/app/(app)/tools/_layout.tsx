import { Stack } from "expo-router";

import { colors } from "@/lib/theme";

export default function ToolsLayout() {
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
      <Stack.Screen name="[id]/status" options={modal} />
      <Stack.Screen name="[id]/assign" options={modal} />
      <Stack.Screen name="[id]/return" options={modal} />
      <Stack.Screen name="[id]/usage-start" options={modal} />
      <Stack.Screen name="[id]/usage-end" options={modal} />
      <Stack.Screen name="[id]/cycles" options={modal} />
    </Stack>
  );
}
