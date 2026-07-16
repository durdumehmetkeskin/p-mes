import { useApiUrl, useCustom } from "@refinedev/core";
import { eachDayOfInterval, parseISO } from "date-fns";
import { useMemo } from "react";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ToolReservationRow {
  id: string;
  status: "reserved" | "delivering" | "received" | "returning" | "returned";
  reservedFrom: string | null;
  reservedTo: string | null;
  stage: {
    id: string;
    name: string;
    status: string;
    estimatedStartDate: string | null;
    estimatedCompletedDate: string | null;
  } | null;
  order: { orderNumber: string } | null;
  project: { code: string; name: string } | null;
}

const ACTIVE = ["delivering", "received", "returning"];

/** Day-by-day view of this tool's stage reservations (painted month calendar). */
export function ToolReservationCalendarCard({ tool }: { tool: { id: string } }) {
  const apiUrl = useApiUrl();
  const { result } = useCustom<ToolReservationRow[]>({
    url: `${apiUrl}/tools/${tool.id}/reservations`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const rows = Array.isArray(result?.data) ? result.data : [];

  const { reserved, active, done, unscheduled, firstDay } = useMemo(() => {
    const reserved: Date[] = [];
    const active: Date[] = [];
    const done: Date[] = [];
    const unscheduled: ToolReservationRow[] = [];
    let first: Date | null = null;
    for (const r of rows) {
      // Prefer the reservation's own datetime range; fall back to the stage's
      // estimated window (legacy rows).
      const s = r.reservedFrom?.slice(0, 10) ?? r.stage?.estimatedStartDate;
      const e = r.reservedTo?.slice(0, 10) ?? r.stage?.estimatedCompletedDate;
      if (!s || !e) {
        unscheduled.push(r);
        continue;
      }
      let days: Date[] = [];
      try {
        days = eachDayOfInterval({ start: parseISO(s), end: parseISO(e) });
      } catch {
        unscheduled.push(r);
        continue;
      }
      if (days[0] && (!first || days[0] < first)) first = days[0];
      const bucket =
        r.status === "reserved" ? reserved : ACTIVE.includes(r.status) ? active : done;
      bucket.push(...days);
    }
    return { reserved, active, done, unscheduled, firstDay: first };
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reservation calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This tool has no stage reservations.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-blue-200" /> Reserved
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-amber-300" /> In use
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-muted" /> Returned
              </span>
            </div>
            <Calendar
              mode="single"
              defaultMonth={firstDay ?? undefined}
              modifiers={{ reserved, active, done }}
              modifiersClassNames={{
                reserved: "bg-blue-200 text-blue-950",
                active: "bg-amber-300 text-amber-950 font-semibold",
                done: "bg-muted text-muted-foreground line-through",
              }}
              className="rounded-md border"
            />
            <ul className="space-y-1 text-sm">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {r.stage?.name ?? "—"}
                    {r.order ? ` · ${r.order.orderNumber}` : ""}
                    {r.stage?.estimatedStartDate && r.stage?.estimatedCompletedDate
                      ? ` · ${r.stage.estimatedStartDate} → ${r.stage.estimatedCompletedDate}`
                      : " · unscheduled"}
                  </span>
                  <StatusBadge label={r.status} />
                </li>
              ))}
            </ul>
            {unscheduled.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {unscheduled.length} reservation(s) have no estimated stage dates and
                aren't shown on the calendar.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
