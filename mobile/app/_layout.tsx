import "../global.css";

import { useCallback, useEffect, useState } from "react";
import { LogBox, Pressable, Text, View } from "react-native";
import { Refine } from "@refinedev/core";
import * as LocalAuthentication from "expo-local-authentication";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Slot, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from "sonner-native";

import { accessControlProvider } from "@/providers/access-control";
import { authProvider } from "@/providers/auth";
import { dataProvider } from "@/providers/data";
import { notificationProvider } from "@/providers/notification";
import { resources } from "@/providers/resources";
import { routerProvider } from "@/providers/router";
import { setApiBaseUrl } from "@/providers/axios";
import { onSessionInvalid } from "@/providers/sessionEvents";
import { getAccessToken, hydrateTokens } from "@/providers/tokenStore";
import {
  getApiOverride,
  getBiometric,
  hydratePrefs,
} from "@/lib/prefs";
import { colors } from "@/lib/theme";

// Benign deprecation from a dependency (react-native-draggable-flatlist still
// calls InteractionManager, deprecated in RN 0.86). Not ours to fix — silence
// the noise so real warnings stay visible.
LogBox.ignoreLogs([/InteractionManager has been deprecated/]);

SplashScreen.preventAutoHideAsync().catch(() => {
  /* no-op: splash may already be hidden */
});

export default function RootLayout() {
  const [tokensReady, setTokensReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
  });

  const [locked, setLocked] = useState(false);

  // Hydrate the SecureStore token mirror + prefs before the router renders so
  // the synchronous auth gate + axios interceptor see the persisted session.
  useEffect(() => {
    Promise.all([hydrateTokens(), hydratePrefs()]).then(() => {
      const override = getApiOverride();
      if (override) setApiBaseUrl(override);
      setTokensReady(true);
    });
  }, []);

  const runAuth = useCallback(async () => {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock p-mes",
      });
      if (res.success) setLocked(false);
    } catch {
      /* keep locked; user can retry */
    }
  }, []);

  // When a refresh fails with a real auth error, bounce to the login screen.
  useEffect(() => {
    return onSessionInvalid(() => {
      router.replace("/login");
    });
  }, []);

  const ready = tokensReady && fontsLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Biometric lock: if enabled and a session exists, require auth on launch.
  useEffect(() => {
    if (ready && getBiometric() && getAccessToken()) {
      setLocked(true);
      runAuth();
    }
  }, [ready, runAuth]);

  if (!ready) return null;

  if (locked) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.background }}
        className="items-center justify-center gap-4 p-6"
      >
        <Text className="font-sans-bold text-2xl text-primary">p-mes</Text>
        <Text className="text-sm text-muted-foreground">Locked</Text>
        <Pressable
          onPress={runAuth}
          className="h-11 items-center justify-center rounded-md bg-primary px-6"
        >
          <Text className="font-sans-semibold text-primary-foreground">Unlock</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <Refine
              dataProvider={dataProvider}
              routerProvider={routerProvider}
              authProvider={authProvider}
              accessControlProvider={accessControlProvider}
              notificationProvider={notificationProvider}
              resources={resources}
              options={{
                disableTelemetry: true,
                syncWithLocation: false,
                warnWhenUnsavedChanges: false,
                // Tame React Query churn (default staleTime:0 + retry:3 caused
                // refetch/re-render storms → jank + tap lag). Refine merges this
                // over its defaults; refetchOnWindowFocus is already false.
                reactQuery: {
                  clientConfig: {
                    defaultOptions: {
                      queries: {
                        staleTime: 60_000,
                        gcTime: 5 * 60_000,
                        retry: 1,
                        refetchOnReconnect: false,
                      },
                      mutations: { retry: 0 },
                    },
                  },
                },
              }}
            >
              <StatusBar style="light" />
              <Slot />
              <Toaster theme="dark" />
            </Refine>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
