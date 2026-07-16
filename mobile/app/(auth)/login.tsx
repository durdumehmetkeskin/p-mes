import { useState } from "react";
import { View } from "react-native";
import { useLogin } from "@refinedev/core";
import { useRouter } from "expo-router";

import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthScreen,
} from "@/components/auth/auth-form";

export default function LoginScreen() {
  const router = useRouter();
  const { mutate: login, isPending } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthScreen title="Sign in" subtitle="p-mes — Manufacturing Execution System">
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
      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />
      <AuthButton
        label="Sign in"
        loading={isPending}
        onPress={() => login({ email, password })}
      />
      <View className="flex-row items-center justify-between">
        <AuthLink label="Create account" onPress={() => router.push("/register")} />
        <AuthLink
          label="Forgot password?"
          onPress={() => router.push("/forgot-password")}
        />
      </View>
    </AuthScreen>
  );
}
