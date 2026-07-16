import { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useLogout } from "@refinedev/core";
import * as LocalAuthentication from "expo-local-authentication";
import Constants from "expo-constants";
import { toast } from "sonner-native";

import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { axiosInstance, setApiBaseUrl } from "@/providers/axios";
import { API_URL } from "@/lib/constants";
import {
  getApiOverride,
  getBiometric,
  setApiOverride,
  setBiometric,
} from "@/lib/prefs";
import { colors } from "@/lib/theme";

export default function SettingsScreen() {
  const { mutate: logout } = useLogout();
  const [url, setUrl] = useState(
    getApiOverride() ?? (axiosInstance.defaults.baseURL as string) ?? API_URL,
  );
  const [biometric, setBio] = useState(getBiometric());

  const applyUrl = async () => {
    await setApiOverride(url);
    setApiBaseUrl(url.trim() || API_URL);
    toast.success("API URL updated");
  };

  const resetUrl = async () => {
    await setApiOverride(null);
    setApiBaseUrl(API_URL);
    setUrl(API_URL);
    toast.success("Reset to default");
  };

  const toggleBiometric = async (on: boolean) => {
    if (on) {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hw || !enrolled) {
        toast.error("No biometric enrolled on this device");
        return;
      }
    }
    setBio(on);
    await setBiometric(on);
  };

  return (
    <Screen title="Settings" tabBar>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="rounded-lg border border-border bg-card p-4">
          <SectionLabel>Security</SectionLabel>
          <View className="mt-1 flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Label>Biometric unlock</Label>
              <Text className="text-xs text-muted-foreground">
                Require Face ID / fingerprint on launch.
              </Text>
            </View>
            <Switch
              value={biometric}
              onValueChange={toggleBiometric}
              trackColor={{ false: colors.input, true: colors.primary }}
              thumbColor={colors.card}
            />
          </View>
        </View>

        <View className="rounded-lg border border-border bg-card p-4">
          <SectionLabel>Developer</SectionLabel>
          <View className="mt-2 gap-2">
            <Label>API base URL</Label>
            <Input
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://10.0.2.2:3000/api"
            />
            <View className="flex-row gap-2">
              <Button variant="outline" label="Reset" className="flex-1" onPress={resetUrl} />
              <Button label="Apply" className="flex-1" onPress={applyUrl} />
            </View>
          </View>
        </View>

        <View className="rounded-lg border border-border bg-card p-4">
          <SectionLabel>About</SectionLabel>
          <FieldRow label="App" value="p-mes" />
          <FieldRow label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
        </View>

        <Button variant="secondary" label="Sign out" onPress={() => logout()} />
      </ScrollView>
    </Screen>
  );
}
