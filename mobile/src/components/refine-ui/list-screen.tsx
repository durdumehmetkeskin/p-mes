import { type ReactNode, useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import {
  type BaseRecord,
  type CrudFilter,
  type CrudSort,
  useInfiniteList,
} from "@refinedev/core";
import { FlashList } from "@shopify/flash-list";
import { Plus } from "lucide-react-native";
import { useRouter } from "expo-router";

import { Can } from "@/components/can";
import { EmptyState } from "@/components/refine-ui/empty-state";
import { Screen } from "@/components/refine-ui/screen";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { colors } from "@/lib/theme";

const CONTENT_PADDING = { padding: 16 } as const;

export interface ListScreenProps<T> {
  resource: string;
  title: string;
  subtitle?: string;
  renderItem: (item: T) => ReactNode;
  keyExtractor?: (item: T) => string;
  filters?: CrudFilter[];
  sorters?: CrudSort[];
  pageSize?: number;
  /** Enable the search bar (filters on `searchField`, default "q"). */
  search?: boolean;
  searchField?: string;
  searchPlaceholder?: string;
  createRoute?: string;
  tabBar?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  headerRight?: ReactNode;
  ListHeader?: ReactNode;
}

export function ListScreen<T extends BaseRecord>({
  resource,
  title,
  subtitle,
  renderItem,
  keyExtractor,
  filters,
  sorters,
  pageSize = 20,
  search = false,
  searchField = "q",
  searchPlaceholder = "Search…",
  createRoute,
  tabBar = false,
  emptyTitle,
  emptyMessage,
  headerRight,
  ListHeader,
}: ListScreenProps<T>) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query);

  const mergedFilters = useMemo<CrudFilter[]>(() => {
    const list: CrudFilter[] = [...(filters ?? [])];
    if (search && debounced.trim()) {
      list.push({ field: searchField, operator: "eq", value: debounced.trim() });
    }
    return list;
  }, [filters, search, debounced, searchField]);

  // Refine v5 returns a { query, result } split.
  const { query: listQuery, result } = useInfiniteList<T>({
    resource,
    pagination: { pageSize },
    filters: mergedFilters,
    sorters,
  });

  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const refetch = listQuery.refetch;
  const isRefetching = listQuery.isRefetching;
  const hasNextPage = result.hasNextPage;
  const fetchNextPage = listQuery.fetchNextPage;
  const isFetchingNextPage = listQuery.isFetchingNextPage;

  const items = useMemo(
    () => result.data?.pages.flatMap((p) => p.data) ?? [],
    [result.data],
  );

  // Stable FlashList props so typing in the search box (internal state change)
  // doesn't recreate them and force every row to re-render.
  const keyFor = useCallback(
    (item: T) => (keyExtractor ? keyExtractor(item) : String(item.id)),
    [keyExtractor],
  );
  const renderRow = useCallback(
    ({ item }: { item: T }) => <>{renderItem(item)}</>,
    [renderItem],
  );
  const separator = useCallback(() => <View className="h-3" />, []);
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const refreshCtl = useMemo(
    () => (
      <RefreshControl
        refreshing={isRefetching}
        onRefresh={refetch}
        tintColor={colors.mutedForeground}
        colors={[colors.primary]}
      />
    ),
    [isRefetching, refetch],
  );
  const listHeaderCmp = useMemo(
    () => (ListHeader ? <>{ListHeader}</> : null),
    [ListHeader],
  );
  const listEmptyCmp = useMemo(
    () => (
      <EmptyState
        title={emptyTitle ?? "Nothing here yet"}
        message={emptyMessage}
      />
    ),
    [emptyTitle, emptyMessage],
  );
  const listFooterCmp = useMemo(
    () =>
      isFetchingNextPage ? (
        <Text className="py-4 text-center text-xs text-muted-foreground">
          Loading…
        </Text>
      ) : null,
    [isFetchingNextPage],
  );

  const right = (
    <>
      {headerRight}
      {createRoute ? (
        <Can resource={resource} action="create">
          <Pressable
            onPress={() => router.push(createRoute)}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
          >
            <Icon icon={Plus} color={colors.foreground} />
          </Pressable>
        </Can>
      ) : null}
    </>
  );

  return (
    <Screen title={title} subtitle={subtitle} headerRight={right} tabBar={tabBar}>
      {search ? (
        <View className="border-b border-border bg-background px-4 py-2">
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ) : null}

      {isLoading ? (
        <View className="gap-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </View>
      ) : isError ? (
        <EmptyState
          title="Couldn't load"
          message="Pull to retry or check your connection."
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={keyFor}
          renderItem={renderRow}
          ListHeaderComponent={listHeaderCmp}
          contentContainerStyle={CONTENT_PADDING}
          ItemSeparatorComponent={separator}
          onEndReachedThreshold={0.4}
          onEndReached={handleEndReached}
          refreshControl={refreshCtl}
          ListEmptyComponent={listEmptyCmp}
          ListFooterComponent={listFooterCmp}
        />
      )}
    </Screen>
  );
}
