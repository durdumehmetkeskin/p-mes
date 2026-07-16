import { useState } from "react";
import { View } from "react-native";
import { useUpdatePassword } from "@refinedev/core";
import { useRouter } from "expo-router";

import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthScreen,
} from "@/components/auth/auth-form";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { mutate: updatePassword, isPending } = useUpdatePassword();
  const [password, setPassword] = useState("");

  return (
    <AuthScreen
      title="Set a new password"
      subtitle="Enter a new password for your account."
    >
      <AuthField
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="New password"
      />
      <AuthButton
        label="Update password"
        loading={isPending}
        onPress={() => updatePassword({ password })}
      />
      <View className="flex-row items-center justify-center">
        <AuthLink label="Back to sign in" onPress={() => router.replace("/login")} />
      </View>
    </AuthScreen>
  );
}
