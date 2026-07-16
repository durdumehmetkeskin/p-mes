import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import {
  type BaseRecord,
  useApiUrl,
  useCustom,
  useInvalidate,
  useOne,
} from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";

interface Tool extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  status?: string;
}
interface ToolReservation {
  id: string;
  status: "reserved" | "delivering" | "received" | "returning" | "returned";
  stage: { id: string; name: string; status: string } | null;
  order: { orderNumber: string } | null;
}

const VERB: Record<string, { verb: string; label: string } | undefined> = {
  reserved: { verb: "deliver", label: "Deliver to stage" },
  delivering: { verb: "receive", label: "Receive" },
  received: { verb: "return", label: "Return to crib" },
  returning: { verb: "receive-return", label: "Receive return" },
};

export default function ToolHandoverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toolId = id as string;
  const router = useRouter();
  const apiUrl = useApiUrl();
  const invalidate = useInvalidate();
  const [busy, setBusy] = useState(false);

  const { result: tool, query: toolQuery } = useOne<Tool>({
    resource: "tools",
    id: toolId,
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const { result: resResult, query } = useCustom<ToolReservation[]>({
    url: `${apiUrl}/tools/${toolId}/reservations`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const reservations = Array.isArray(resResult?.data) ? resResult.data : [];
  const actionable = reservations.filter((r) => VERB[r.status]);

  const run = (rid: string, verb: string) => {
    setBusy(true);
    axiosInstance
      .post(`/tool-reservations/${rid}/${verb}`)
      .then(() => {
        invalidate({ resource: "tools", invalidates: ["list", "detail"] });
        query.refetch();
      })
      .catch((err: { response?: { data?: { message?: string | string[] } } }) => {
        const msg = err?.response?.data?.message;
        Alert.alert("Failed", Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error"));
      })
      .finally(() => setBusy(false));
  };

  return (
    <Screen title="Tool handover" subtitle={tool?.name} canGoBack>
      {toolQuery.isLoading ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-40 w-full" />
        </View>
      ) : !tool ? (
        <View className="p-4">
          <Text className="text-sm text-muted-foreground">
            Could not load this tool.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <SectionLabel>Tool</SectionLabel>
              {tool.status ? <StatusBadge label={tool.status} /> : null}
            </View>
            <FieldRow
              label="Tool"
              value={[tool.code, tool.name].filter(Boolean).join(" · ")}
            />
          </View>

          {actionable.length === 0 ? (
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                No handover action available for this tool.
              </Text>
              <Text
                className="text-sm text-primary"
                onPress={() => router.replace(`/tools/${toolId}`)}
              >
                Open tool →
              </Text>
            </View>
          ) : (
            actionable.map((r) => {
              const meta = VERB[r.status]!;
              const canReturn =
                r.status !== "received" || r.stage?.status === "completed";
              return (
                <View
                  key={r.id}
                  className="gap-2 rounded-lg border border-border bg-card p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 pr-2 font-sans-medium text-sm text-foreground">
                      {r.stage?.name ?? "—"}
                      {r.order ? ` · ${r.order.orderNumber}` : ""}
                    </Text>
                    <StatusBadge label={r.status} />
                  </View>
                  {r.status === "received" && !canReturn ? (
                    <Text className="text-xs text-muted-foreground">
                      Complete the stage before returning the tool.
                    </Text>
                  ) : (
                    <Button
                      label={meta.label}
                      disabled={busy}
                      onPress={() => run(r.id, meta.verb)}
                    />
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
