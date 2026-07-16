import { Text, View } from "react-native";
import { Link, usePathname } from "expo-router";

import { colors } from "@/lib/theme";

/**
 * Catch-all. During the phased build this also gracefully covers nav targets
 * whose screens aren't implemented yet.
 */
export default function NotFoundScreen() {
  const pathname = usePathname();
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background p-6">
      <Text className="font-sans-bold text-lg text-foreground">
        Not available yet
      </Text>
      <Text className="text-center text-sm text-muted-foreground">
        {pathname
          ? `“${pathname}” isn't built in this phase.`
          : "This screen isn't built yet."}
      </Text>
      <Link href="/" style={{ color: colors.primary, marginTop: 8 }}>
        Go to Dashboard
      </Link>
    </View>
  );
}
