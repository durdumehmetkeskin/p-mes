import { useMemo } from "react";
import { Text, View } from "react-native";
import { useApiUrl, useCustom } from "@refinedev/core";
import { Calendar } from "react-native-calendars";

import { SectionLabel } from "@/components/refine-ui/field-row";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { colors } from "@/lib/theme";

interface Row {
  id: string;
  status: "reserved" | "delivering" | "received" | "returning" | "returned";
  stage: {
    name: string;
    estimatedStartDate: string | null;
    estimatedCompletedDate: string | null;
  } | null;
  order: { orderNumber: string } | null;
}

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const e = new Date(end);
  for (let d = new Date(start); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const calTheme = {
  backgroundColor: colors.card,
  calendarBackground: colors.card,
  dayTextColor: colors.foreground,
  monthTextColor: colors.foreground,
  textDisabledColor: colors.mutedForeground,
  todayTextColor: colors.primary,
  arrowColor: colors.primary,
  textSectionTitleColor: colors.mutedForeground,
} as const;

const STATUS_COLOR: Record<string, string> = {
  reserved: "#3b82f6",
  delivering: "#f59e0b",
  received: "#f59e0b",
  returning: "#f59e0b",
  returned: colors.mutedForeground,
};

/** Day-by-day view of the tool's stage reservations (painted month calendar). */
export function ToolReservationCalendar({ toolId }: { toolId: string }) {
  const apiUrl = useApiUrl();
  const { result } = useCustom<Row[]>({
    url: `${apiUrl}/tools/${toolId}/reservations`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const rows = Array.isArray(result?.data) ? result.data : [];

  const marked = useMemo(() => {
    const m: Record<string, object> = {};
    for (const r of rows) {
      const s = r.stage?.estimatedStartDate;
      const e = r.stage?.estimatedCompletedDate;
      if (!s || !e) continue;
      const color = STATUS_COLOR[r.status] ?? colors.mutedForeground;
      const days = eachDay(s, e);
      days.forEach((d, i) => {
        m[d] = {
          color,
          textColor: "#ffffff",
          startingDay: i === 0,
          endingDay: i === days.length - 1,
        };
      });
    }
    return m;
  }, [rows]);

  return (
    <View className="rounded-lg border border-border bg-card p-4">
      <SectionLabel>Reservation calendar</SectionLabel>
      {rows.length === 0 ? (
        <Text className="mt-2 text-xs text-muted-foreground">
          No stage reservations for this tool.
        </Text>
      ) : (
        <View className="mt-2 gap-2">
          <Calendar
            markingType="period"
            markedDates={marked}
            theme={calTheme}
            style={{ borderRadius: 8 }}
          />
          <View className="gap-1">
            {rows.map((r) => (
              <View
                key={r.id}
                className="flex-row items-center justify-between gap-2"
              >
                <Text className="flex-1 pr-2 text-sm text-foreground">
                  {r.stage?.name ?? "—"}
                  {r.order ? ` · ${r.order.orderNumber}` : ""}
                  {r.stage?.estimatedStartDate && r.stage?.estimatedCompletedDate
                    ? ""
                    : " · unscheduled"}
                </Text>
                <StatusBadge label={r.status} />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
