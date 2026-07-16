import { Pressable } from "react-native";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  ClipboardCheck,
  Boxes,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import { ActionMenu } from "@/components/ui/action-menu";
import { Icon } from "@/components/ui/icon";
import { colors } from "@/lib/theme";

/** Header button that opens the Receive / Issue / Transfer / Count menu. */
export function StockActionsButton() {
  const router = useRouter();
  return (
    <ActionMenu
      title="Stock actions"
      options={[
        {
          label: "Goods receipt",
          icon: ArrowDownToLine,
          onPress: () => router.push("/goods-receipt"),
        },
        {
          label: "Goods issue",
          icon: ArrowUpFromLine,
          onPress: () => router.push("/goods-issue"),
        },
        {
          label: "Transfer",
          icon: ArrowRightLeft,
          onPress: () => router.push("/goods-transfer"),
        },
        {
          label: "Stock count",
          icon: ClipboardCheck,
          onPress: () => router.push("/stock-count"),
        },
      ]}
      trigger={(open) => (
        <Pressable
          onPress={open}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
        >
          <Icon icon={Boxes} color={colors.foreground} />
        </Pressable>
      )}
    />
  );
}
