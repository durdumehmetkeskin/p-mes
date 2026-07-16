import { useCallback, useState } from "react";
import { InteractionManager, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { toast } from "sonner-native";

import { Screen } from "@/components/refine-ui/screen";
import { Button } from "@/components/ui/button";
import { parseQr, routeToQrEntity } from "@/lib/qr";

export default function ScanScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  // The full-screen camera is mounted only after the screen is focused AND the
  // navigation/drawer transition has settled. Initialising the camera mid-
  // transition janks the JS thread and interrupts the drawer's close animation,
  // leaving the sidebar stuck open. Deferring the mount avoids that, and the
  // camera is released again on blur.
  const [cameraActive, setCameraActive] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Defensive: make sure the drawer that navigated us here is closed (the
      // heavy camera mount has been known to interrupt its close animation).
      const nav = navigation as unknown as {
        closeDrawer?: () => void;
        getParent?: () => { closeDrawer?: () => void } | undefined;
      };
      if (typeof nav.closeDrawer === "function") nav.closeDrawer();
      else nav.getParent?.()?.closeDrawer?.();

      const task = InteractionManager.runAfterInteractions(() =>
        setCameraActive(true),
      );
      return () => {
        task.cancel();
        setCameraActive(false);
        setBusy(false);
      };
    }, [navigation]),
  );

  const onScanned = async (result: { data: string }) => {
    if (busy) return;
    setBusy(true);
    const payload = parseQr(result.data);
    if (!payload) {
      toast.error("Unrecognized QR code");
      setTimeout(() => setBusy(false), 1500);
      return;
    }
    const ok = await routeToQrEntity(payload, router);
    if (!ok) {
      toast.error("Could not open that item");
      setTimeout(() => setBusy(false), 1500);
    }
  };

  return (
    <Screen title="Scan QR" tabBar>
      {!permission ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-sm text-muted-foreground">Requesting camera…</Text>
        </View>
      ) : !permission.granted ? (
        <View className="flex-1 items-center justify-center gap-4 p-6">
          <Text className="text-center text-sm text-muted-foreground">
            Camera access is needed to scan QR codes.
          </Text>
          <Button label="Grant camera access" onPress={requestPermission} />
        </View>
      ) : (
        <View className="flex-1">
          {cameraActive ? (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={busy ? undefined : onScanned}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-sm text-muted-foreground">Opening camera…</Text>
            </View>
          )}
          <View className="absolute inset-x-0 bottom-8 items-center">
            <Text className="rounded-full bg-card px-3 py-1.5 text-xs text-foreground">
              Point at a material, tool or order QR
            </Text>
          </View>
        </View>
      )}
    </Screen>
  );
}
