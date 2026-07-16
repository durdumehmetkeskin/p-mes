import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Check, ChevronDown } from "lucide-react-native";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";

export interface SelectOption {
  label: string;
  value: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchable = true,
  onSearch,
  disabled = false,
  allowClear = false,
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  /** When provided, filtering is delegated to the server (options are shown as-is). */
  onSearch?: (query: string) => void;
  disabled?: boolean;
  allowClear?: boolean;
}) {
  const ref = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!searchable || !query || onSearch) return options;
    const s = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, query, searchable, onSearch]);

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
      <Pressable
        disabled={disabled}
        onPress={() => ref.current?.present()}
        className={cn(
          "h-11 flex-row items-center justify-between rounded-md border border-input bg-card px-3",
          disabled && "opacity-50",
        )}
      >
        <Text
          numberOfLines={1}
          className={cn(
            "flex-1 text-base",
            selected ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Icon icon={ChevronDown} size={18} color={colors.mutedForeground} />
      </Pressable>

      <BottomSheetModal
        ref={ref}
        snapPoints={["55%", "85%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
      >
        {searchable ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <BottomSheetTextInput
              placeholder="Search…"
              placeholderTextColor={colors.mutedForeground}
              onChangeText={(t) => {
                setQuery(t);
                onSearch?.(t);
              }}
              style={{
                borderWidth: 1,
                borderColor: colors.input,
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                color: colors.foreground,
                fontSize: 16,
              }}
            />
          </View>
        ) : null}

        <BottomSheetFlatList
          data={filtered}
          keyExtractor={(item) => item.value}
          ListHeaderComponent={
            allowClear && value != null ? (
              <Pressable
                onPress={() => {
                  onChange(null);
                  ref.current?.dismiss();
                }}
                className="border-b border-border px-4 py-3"
              >
                <Text className="text-sm text-muted-foreground">Clear selection</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => {
            const active = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  ref.current?.dismiss();
                }}
                className="flex-row items-center justify-between px-4 py-3"
              >
                <Text
                  className={cn(
                    "flex-1 text-base",
                    active ? "font-sans-medium text-primary" : "text-foreground",
                  )}
                >
                  {item.label}
                </Text>
                {active ? (
                  <Icon icon={Check} size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text className="p-4 text-center text-sm text-muted-foreground">
              No options
            </Text>
          }
        />
      </BottomSheetModal>
    </>
  );
}
