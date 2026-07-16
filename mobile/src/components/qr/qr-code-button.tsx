import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { QrCode } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { downloadAndShare, fetchImageDataUri } from "@/lib/download";
import { colors } from "@/lib/theme";

/** Header button that shows an entity's QR PNG (authed) with share/print. */
export function QrCodeButton({
  resource,
  id,
  code,
}: {
  resource: string;
  id: string;
  code?: string;
}) {
  const ref = useRef<BottomSheetModal>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const url = `/${resource}/${id}/qr`;

  const open = async () => {
    ref.current?.present();
    if (uri) return;
    setLoading(true);
    try {
      setUri(await fetchImageDataUri(url));
    } catch {
      toast.error("Could not load QR");
    } finally {
      setLoading(false);
    }
  };

  const share = () =>
    downloadAndShare({ url, fallbackName: `${code ?? id}-qr.png` }).catch(() =>
      toast.error("Share failed"),
    );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );

  return (
    <>
      <Pressable
        onPress={open}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
      >
        <Icon icon={QrCode} color={colors.foreground} />
      </Pressable>
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
      >
        <BottomSheetView>
          <SafeAreaView edges={["bottom"]}>
            <View className="items-center gap-4 p-6">
              {loading ? (
                <View style={{ width: 240, height: 240 }} className="items-center justify-center">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : uri ? (
                <View className="rounded-lg bg-white p-3">
                  <Image
                    source={{ uri }}
                    style={{ width: 220, height: 220 }}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <Text className="text-sm text-muted-foreground">No QR</Text>
              )}
              {code ? (
                <Text className="font-mono text-sm text-foreground">{code}</Text>
              ) : null}
              <Button label="Share / Print" className="w-full" onPress={share} />
            </View>
          </SafeAreaView>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
