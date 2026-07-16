import { Redirect, Stack } from "expo-router";

import { getAccessToken } from "@/providers/tokenStore";

export default function AuthGroupLayout() {
  // Already signed in? Skip the auth screens.
  if (getAccessToken()) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0b1326" },
      }}
    />
  );
}
