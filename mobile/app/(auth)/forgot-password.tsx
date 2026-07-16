import { useState } from "react";
import { View } from "react-native";
import { useForgotPassword } from "@refinedev/core";
import { useRouter } from "expo-router";

import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthScreen,
} from "@/components/auth/auth-form";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { mutate: forgotPassword, isPending } = useForgotPassword();
  const [email, setEmail] = useState("");

  return (
    <AuthScreen
      title="Reset password"
      subtitle="We'll send a reset link if the email exists."
    >
      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        placeholder="you@example.com"
      />
      <AuthButton
        label="Send reset link"
        loading={isPending}
        onPress={() => forgotPassword({ email })}
      />
      <View className="flex-row items-center justify-center">
        <AuthLink label="Back to sign in" onPress={() => router.replace("/login")} />
      </View>
    </AuthScreen>
  );
}
