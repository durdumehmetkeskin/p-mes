import { Pressable, Text, View } from "react-native";
import {
  type BaseRecord,
  useApiUrl,
  useCustomMutation,
  useInvalidate,
  useUpdate,
} from "@refinedev/core";
import { CheckCheck } from "lucide-react-native";
import { useRouter } from "expo-router";

import { ListScreen } from "@/components/refine-ui/list-screen";
import { Icon } from "@/components/ui/icon";
import { colors } from "@/lib/theme";

interface NotificationRow extends BaseRecord {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  read?: boolean;
  link?: string | null;
  createdAt?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const apiUrl = useApiUrl();
  const invalidate = useInvalidate();
  const { mutate: markRead } = useUpdate();
  const { mutate: postReadAll } = useCustomMutation();

  const refresh = () =>
    invalidate({ resource: "notifications", invalidates: ["list"] });

  const openItem = (n: NotificationRow) => {
    if (!n.read) {
      markRead(
        { resource: "notifications", id: n.id, values: { read: true } },
        { onSuccess: refresh },
      );
    }
    if (n.link) router.push(n.link as never);
  };

  const readAll = () =>
    postReadAll(
      { url: `${apiUrl}/notifications/read-all`, method: "post", values: {} },
      { onSuccess: refresh },
    );

  return (
    <ListScreen<NotificationRow>
      resource="notifications"
      title="Notifications"
      tabBar
      sorters={[{ field: "createdAt", order: "desc" }]}
      emptyTitle="No notifications"
      headerRight={
        <Pressable
          onPress={readAll}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
          accessibilityLabel="Mark all read"
        >
          <Icon icon={CheckCheck} color={colors.foreground} />
        </Pressable>
      }
      renderItem={(n) => (
        <Pressable
          onPress={() => openItem(n)}
          className={
            n.read
              ? "rounded-lg border border-border bg-card p-3 active:opacity-80"
              : "rounded-lg border border-border bg-muted/40 p-3 active:opacity-80"
          }
        >
          <View className="flex-row items-start gap-2">
            {!n.read ? (
              <View className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
            ) : null}
            <View className="flex-1">
              <Text className="font-sans-semibold text-sm text-foreground">
                {n.title}
              </Text>
              <Text className="text-xs text-muted-foreground">{n.message}</Text>
              {n.createdAt ? (
                <Text className="mt-0.5 text-[10px] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </Text>
              ) : null}
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}
