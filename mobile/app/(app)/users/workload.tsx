import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import { EmptyState } from "@/components/refine-ui/empty-state";
import { Screen } from "@/components/refine-ui/screen";
import { SimpleGantt, type GanttRow } from "@/components/charts/simple-gantt";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

interface WorkItem {
  id: string;
  kind: "stage" | "process";
  title: string;
  start: string | null;
  end: string | null;
  status: string;
}
interface WorkloadUser {
  userId: string;
  userName: string;
  items: WorkItem[];
}

const DAY = 86400000;
const STATUS_COLOR: Record<string, string> = {
  completed: colors.success,
  in_progress: colors.info,
  pending: colors.mutedForeground,
  draft: colors.mutedForeground,
};

export default function WorkloadScreen() {
  const [users, setUsers] = useState<WorkloadUser[] | null>(null);

  useEffect(() => {
    axiosInstance
      .get<WorkloadUser[]>("/workload")
      .then((r) => setUsers(r.data ?? []))
      .catch(() => setUsers([]));
  }, []);

  let min = Infinity;
  let max = -Infinity;
  const rows: GanttRow[] = (users ?? []).map((u) => {
    const bars = u.items
      .filter((it) => it.start)
      .map((it) => {
        const start = new Date(it.start as string).getTime();
        const end = Math.max(
          it.end ? new Date(it.end).getTime() : start,
          start + DAY,
        );
        min = Math.min(min, start);
        max = Math.max(max, end);
        return { start, end, color: STATUS_COLOR[it.status] ?? colors.mutedForeground };
      });
    return { label: `${u.userName} (${u.items.length})`, bars };
  });

  return (
    <Screen title="Workload" canGoBack>
      {users === null ? (
        <View className="p-4">
          <Skeleton className="h-48 w-full" />
        </View>
      ) : rows.length === 0 || !Number.isFinite(min) ? (
        <EmptyState
          title="No workload"
          message="Assigned, scheduled tasks appear here (needs Processes: Read)."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <SimpleGantt rows={rows} domainStart={min} domainEnd={max} />
        </ScrollView>
      )}
    </Screen>
  );
}
