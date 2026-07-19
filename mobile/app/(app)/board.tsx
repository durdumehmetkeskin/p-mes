import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useList } from "@refinedev/core";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionMenu } from "@/components/ui/action-menu";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { axiosInstance } from "@/providers/axios";

interface StageCard {
  id: string;
  name: string;
  sequence: number;
  status: string;
  projectId: string | null;
  projectName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  processName: string | null;
  estimatedStartDate: string | null;
  estimatedCompletedDate: string | null;
}

const COLUMNS: { key: string; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

export default function BoardScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<StageCard[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (projectId) params.projectId = projectId;
      if (userId) params.userId = userId;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await axiosInstance.get<{
        isAdmin: boolean;
        cards: StageCard[];
      }>("/stage-board", { params });
      setCards(res.data.cards ?? []);
      setIsAdmin(Boolean(res.data.isAdmin));
    } catch {
      setCards([]);
    }
  }, [projectId, userId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const { result: projects } = useList<BaseRecord>({
    resource: "projects",
    pagination: { mode: "off" },
    queryOptions: { enabled: isAdmin, retry: false },
    errorNotification: false,
  });
  const { result: users } = useList<BaseRecord>({
    resource: "users",
    pagination: { mode: "off" },
    queryOptions: { enabled: isAdmin, retry: false },
    errorNotification: false,
  });

  const byStatus = useMemo(() => {
    const map: Record<string, StageCard[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    };
    for (const c of cards) (map[c.status] ??= []).push(c);
    return map;
  }, [cards]);

  const move = async (id: string, target: string) => {
    try {
      await axiosInstance.patch(`/process-stages/${id}/status`, {
        status: target,
      });
      await load();
      toast.success("Status updated");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not change status";
      toast.error(String(msg));
      await load();
    }
  };

  return (
    <Screen title="Board" tabBar>
      <View className="flex-1">
        {isAdmin ? (
          <View className="gap-2 border-b border-border p-3">
            <SearchableSelect
              value={projectId}
              onChange={setProjectId}
              allowClear
              placeholder="All projects"
              options={(projects?.data ?? []).map((p) => ({
                label: [p.code, p.name].filter(Boolean).join(" · "),
                value: String(p.id),
              }))}
            />
            <SearchableSelect
              value={userId}
              onChange={setUserId}
              allowClear
              placeholder="All users"
              options={(users?.data ?? []).map((u) => ({
                label: String(u.name),
                value: String(u.id),
              }))}
            />
            <View className="flex-row gap-2">
              <View className="flex-1 gap-1">
                <Label>From</Label>
                <Input
                  value={from}
                  onChangeText={setFrom}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
              </View>
              <View className="flex-1 gap-1">
                <Label>To</Label>
                <Input
                  value={to}
                  onChangeText={setTo}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>
        ) : null}

        <ScrollView
          horizontal
          contentContainerStyle={{ padding: 12, gap: 12 }}
          style={{ flex: 1 }}
        >
          {COLUMNS.map((col) => (
            <View
              key={col.key}
              style={{ width: 280 }}
              className="rounded-lg border border-border bg-muted/30"
            >
              <View className="flex-row items-center justify-between border-b border-border p-3">
                <Text className="font-sans-semibold text-sm text-foreground">
                  {col.label}
                </Text>
                <Badge variant="secondary">
                  {String(byStatus[col.key]?.length ?? 0)}
                </Badge>
              </View>
              <ScrollView contentContainerStyle={{ padding: 8, gap: 8 }}>
                {(byStatus[col.key] ?? []).length === 0 ? (
                  <Text className="p-3 text-center text-xs text-muted-foreground">
                    No stages.
                  </Text>
                ) : (
                  (byStatus[col.key] ?? []).map((c) => (
                    <ActionMenu
                      key={c.id}
                      title={`${c.sequence}. ${c.name}`}
                      options={[
                        ...COLUMNS.filter((cc) => cc.key !== c.status).map(
                          (cc) => ({
                            label: `Move to ${cc.label}`,
                            onPress: () => void move(c.id, cc.key),
                          }),
                        ),
                        {
                          label: "Open order",
                          onPress: () => {
                            if (c.projectId && c.orderId)
                              router.push(
                                `/projects/${c.projectId}/orders/${c.orderId}`,
                              );
                          },
                        },
                      ]}
                      trigger={(open) => (
                        <Pressable
                          onPress={open}
                          className="rounded-md border border-border bg-card p-3 active:opacity-80"
                        >
                          <View className="mb-1 flex-row items-start justify-between gap-2">
                            <Text className="flex-1 text-sm text-foreground">
                              {c.sequence}. {c.name}
                            </Text>
                            {c.processName ? (
                              <Badge variant="outline">{c.processName}</Badge>
                            ) : null}
                          </View>
                          <Text className="text-xs text-muted-foreground">
                            {c.projectName ?? "—"}
                            {c.orderNumber ? ` · ${c.orderNumber}` : ""}
                          </Text>
                          {c.estimatedStartDate ? (
                            <Text className="mt-1 text-xs text-muted-foreground">
                              {c.estimatedStartDate}
                              {c.estimatedCompletedDate
                                ? ` → ${c.estimatedCompletedDate}`
                                : ""}
                            </Text>
                          ) : null}
                        </Pressable>
                      )}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}
