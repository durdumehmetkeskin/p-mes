import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

const MUTED = "#9ba1b4";

/** Minimal auth-screen scaffold (Phase 1). Superseded by the general form kit
 *  built in Phase 3, but kept auth-specific + self-contained here. */
export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
        bottomOffset={24}
      >
        <View className="w-full max-w-md self-center gap-6">
          <View className="items-center">
            <Image
              source={require("../../../assets/logo.png")}
              style={{ width: 96, height: 96 }}
              resizeMode="contain"
            />
          </View>
          <View className="gap-1">
            <Text className="font-sans-bold text-2xl text-foreground">
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-sm text-muted-foreground">{subtitle}</Text>
            ) : null}
          </View>
          <View className="gap-4">{children}</View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

export function AuthField({
  label,
  ...props
}: { label: string } & TextInputProps) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans-medium text-sm text-foreground">{label}</Text>
      <TextInput
        placeholderTextColor={MUTED}
        className="rounded-md border border-input bg-card px-3 py-2.5 text-base text-foreground"
        {...props}
      />
    </View>
  );
}

export function AuthButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      className={cn(
        "h-11 flex-row items-center justify-center rounded-md bg-primary px-4",
        off && "opacity-60",
      )}
    >
      {loading ? (
        <ActivityIndicator color="#002e6a" />
      ) : (
        <Text className="font-sans-semibold text-primary-foreground">
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function AuthLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="py-1">
      <Text className="text-sm text-primary">{label}</Text>
    </Pressable>
  );
}
