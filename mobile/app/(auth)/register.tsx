import { useState } from "react";
import { View } from "react-native";
import { useRegister } from "@refinedev/core";
import { useRouter } from "expo-router";

import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthScreen,
} from "@/components/auth/auth-form";

export default function RegisterScreen() {
  const router = useRouter();
  const { mutate: register, isPending } = useRegister();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthScreen title="Create account" subtitle="Register to access p-mes">
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
        placeholder="Choose a password"
      />
      <AuthButton
        label="Create account"
        loading={isPending}
        onPress={() => register({ email, password })}
      />
      <View className="flex-row items-center justify-center">
        <AuthLink
          label="Already have an account? Sign in"
          onPress={() => router.replace("/login")}
        />
      </View>
    </AuthScreen>
  );
}
