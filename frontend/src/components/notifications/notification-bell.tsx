import {
  useApiUrl,
  useCustomMutation,
  useInvalidate,
  useList,
  useUpdate,
} from "@refinedev/core";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const apiUrl = useApiUrl();
  const { mutate: markRead } = useUpdate();
  const { mutate: postReadAll } = useCustomMutation();

  const { result: unread } = useList<NotificationRow>({
    resource: "notifications",
    pagination: { pageSize: 1 },
    filters: [{ field: "read", operator: "eq", value: false }],
    queryOptions: { refetchInterval: 30_000 },
  });
  const unreadCount = unread?.total ?? 0;

  const { result: recent } = useList<NotificationRow>({
    resource: "notifications",
    pagination: { pageSize: 12 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });
  const rows = recent?.data ?? [];

  const refresh = () =>
    invalidate({ resource: "notifications", invalidates: ["list"] });

  const openItem = (n: NotificationRow) => {
    if (!n.read) {
      markRead(
        { resource: "notifications", id: n.id, values: { read: true } },
        { onSuccess: refresh },
      );
    }
    if (n.link) navigate(n.link);
  };

  const readAll = () =>
    postReadAll(
      { url: `${apiUrl}/notifications/read-all`, method: "post", values: {} },
      { onSuccess: refresh },
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-sm font-semibold">Bildirimler</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={readAll}>
              Tümünü okundu işaretle
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Bildirim yok.
            </p>
          ) : (
            rows.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                className={cn(
                  "block w-full border-b px-3 py-2 text-left last:border-0 hover:bg-accent",
                  !n.read && "bg-muted/40",
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
