import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button } from "@/components/ui/button";

/**
 * Scaffold for create/edit screens presented as modal stack screens (the RN
 * analogue of the web RouteFormDialog). Cancel closes; the primary button
 * submits.
 */
export function FormScreen({
  title,
  onSubmit,
  submitting = false,
  submitLabel = "Save",
  children,
}: {
  title: string;
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="flex-row items-center justify-between gap-2 border-b border-border px-3 py-2">
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
            }}
            hitSlop={8}
            className="h-9 justify-center px-1"
          >
            <Text className="text-sm text-primary">Cancel</Text>
          </Pressable>
          <Text
            numberOfLines={1}
            className="flex-1 text-center font-sans-semibold text-base text-foreground"
          >
            {title}
          </Text>
          <Button
            size="sm"
            label={submitLabel}
            loading={submitting}
            onPress={onSubmit}
          />
        </View>
      </SafeAreaView>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </KeyboardAwareScrollView>
    </View>
  );
}
