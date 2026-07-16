import { type ReactNode, useCallback, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import type { LucideIcon } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";

export interface ActionMenuOption {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onPress: () => void;
}

/** Bottom-sheet action menu (the RN analogue of a dropdown-menu / action sheet). */
export function ActionMenu({
  trigger,
  options,
  title,
}: {
  trigger: (open: () => void) => ReactNode;
  options: ActionMenuOption[];
  title?: string;
}) {
  const ref = useRef<BottomSheetModal>(null);
  const open = () => ref.current?.present();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <>
      {trigger(open)}
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
      >
        <BottomSheetView>
          <SafeAreaView edges={["bottom"]}>
            {title ? (
              <Text className="px-4 pb-1 pt-2 text-xs font-sans-semibold uppercase tracking-wider text-muted-foreground">
                {title}
              </Text>
            ) : null}
            {options.map((o) => (
              <Pressable
                key={o.label}
                onPress={() => {
                  ref.current?.dismiss();
                  // Defer so the sheet is dismissed before navigation.
                  setTimeout(o.onPress, 10);
                }}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-accent"
              >
                {o.icon ? (
                  <Icon
                    icon={o.icon}
                    size={18}
                    color={o.destructive ? colors.destructive : colors.foreground}
                  />
                ) : null}
                <Text
                  className={cn(
                    "text-base",
                    o.destructive ? "text-destructive" : "text-foreground",
                  )}
                >
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </SafeAreaView>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
