import { Pressable, ScrollView, Text, View } from "react-native";

import { cn } from "@/lib/utils";

export interface TabDef {
  key: string;
  label: string;
}

/** Horizontal scrollable underline tab bar (custom, avoids RN top-tab navigator). */
export function SegmentedTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <View className="border-b border-border bg-background">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8 }}
      >
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <Pressable
              key={t.key}
              onPress={() => onChange(t.key)}
              className={cn(
                "border-b-2 px-3 py-2.5",
                on ? "border-primary" : "border-transparent",
              )}
            >
              <Text
                className={cn(
                  "text-sm",
                  on
                    ? "font-sans-semibold text-primary"
                    : "text-muted-foreground",
                )}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
