import { Pressable, Text, View } from "react-native";
import type { BaseRecord } from "@refinedev/core";
import { format } from "date-fns";
import { GanttChartSquare } from "lucide-react-native";
import { useRouter } from "expo-router";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { ListScreen } from "@/components/refine-ui/list-screen";
import { colors } from "@/lib/theme";

interface User extends BaseRecord {
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
  createdAt?: string;
}

export default function UsersListScreen() {
  const router = useRouter();
  return (
    <ListScreen<User>
      resource="users"
      title="Users"
      search
      createRoute="/users/create"
      tabBar
      headerRight={
        <Pressable
          onPress={() => router.push("/users/workload")}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
        >
          <Icon icon={GanttChartSquare} color={colors.foreground} />
        </Pressable>
      }
      emptyTitle="No users"
      renderItem={(u) => (
        <Pressable
          onPress={() => router.push(`/users/${u.id}`)}
          className="rounded-lg border border-border bg-card p-3 active:opacity-80"
        >
          <Text className="font-sans-semibold text-base text-foreground">
            {u.name}
          </Text>
          <Text className="text-xs text-muted-foreground">{u.email}</Text>
          {u.roles?.length ? (
            <View className="mt-2 flex-row flex-wrap gap-1">
              {u.roles.map((r) => (
                <Badge key={r} variant="secondary">
                  {r}
                </Badge>
              ))}
            </View>
          ) : null}
          {u.createdAt ? (
            <Text className="mt-1 text-[11px] text-muted-foreground">
              Joined {format(new Date(u.createdAt), "dd MMM yyyy")}
            </Text>
          ) : null}
        </Pressable>
      )}
    />
  );
}
