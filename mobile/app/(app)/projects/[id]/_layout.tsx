import { Stack } from "expo-router";

import { colors } from "@/lib/theme";

export default function ProjectWorkspaceStack() {
  const modal = { presentation: "modal" as const };
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="edit" options={modal} />
      <Stack.Screen name="order-new" options={modal} />
      <Stack.Screen name="order-item-new" options={modal} />
      <Stack.Screen name="process-new" options={modal} />
      <Stack.Screen name="category-new" options={modal} />
      <Stack.Screen name="stage-type-new" options={modal} />
      <Stack.Screen name="required-material-new" options={modal} />
      <Stack.Screen name="contact-new" options={modal} />
      <Stack.Screen name="reorder-stages" options={modal} />
      <Stack.Screen name="workflow-new" options={modal} />
    </Stack>
  );
}
