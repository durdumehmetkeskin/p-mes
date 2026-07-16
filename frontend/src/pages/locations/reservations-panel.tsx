import { useDelete, useInvalidate, useList } from "@refinedev/core";
import { Thermometer, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Can } from "@/components/can";
import { axiosInstance } from "@/providers/axios";
import { ConfirmDelete } from "@/pages/projects/workspace/confirm-delete";

interface ReservationRow {
  id: string;
  sectionId: string;
  orderId: string;
  startDate: string;
  endDate: string;
  startAt: string | null;
  endAt: string | null;
  note: string | null;
  section: { code: string; name: string } | null;
  order: { orderNumber: string } | null;
}

/** Wall-clock display — never toLocaleString (it would shift the hours). */
const fmtWall = (iso: string | null, fallback: string): string =>
  iso ? iso.slice(0, 16).replace("T", " ") : fallback;
interface Summary {
  count: number;
  tempMin: number | null;
  tempMax: number | null;
  tempAvg: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
  humidityAvg: number | null;
}

function summaryText(s: Summary): string {
  if (!s.count) return "No readings recorded for this period.";
  return `${s.count} readings · Temp ${s.tempMin}–${s.tempMax}°C (avg ${s.tempAvg}) · RH ${s.humidityMin}–${s.humidityMax}% (avg ${s.humidityAvg})`;
}

function ConditionsDialog({ reservationId }: { reservationId: string }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get<{ summary: Summary }>(
        `/section-reservations/${reservationId}/conditions`,
      );
      setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void load();
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" title="Production conditions">
          <Thermometer className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Production conditions</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : summary ? (
          <p className="text-sm">{summaryText(summary)}</p>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ReservationsPanel({ locationId }: { locationId: string }) {
  const { mutate: remove } = useDelete();
  const invalidate = useInvalidate();
  const { result } = useList<ReservationRow>({
    resource: "section-reservations",
    filters: [{ field: "locationId", operator: "eq", value: locationId }],
    // Most recent reservation first.
    sorters: [{ field: "startDate", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(locationId) },
  });
  const rows = result?.data ?? [];

  const refresh = () =>
    invalidate({ resource: "section-reservations", invalidates: ["list"] });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Reservations ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Reservations are created from a process stage (pick this location and a
          section there).
        </p>
        {rows.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Section</th>
                <th className="pb-2 font-medium">Order</th>
                <th className="pb-2 font-medium">Dates</th>
                <th className="pb-2 font-medium">Note</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2">
                    {r.section ? `${r.section.code} · ${r.section.name}` : "—"}
                  </td>
                  <td className="py-2">{r.order?.orderNumber ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">
                    {fmtWall(r.startAt, r.startDate)} →{" "}
                    {fmtWall(r.endAt, r.endDate)}
                  </td>
                  <td className="py-2 text-muted-foreground">{r.note ?? "—"}</td>
                  <td className="py-2">
                    <div className="flex justify-end gap-2">
                      <ConditionsDialog reservationId={r.id} />
                      <Can perm="section-reservations:delete">
                        <ConfirmDelete
                          title="Delete reservation?"
                          description="This reservation will be removed."
                          onConfirm={() =>
                            remove(
                              { resource: "section-reservations", id: r.id },
                              { onSuccess: refresh },
                            )
                          }
                          trigger={
                            <Button size="icon" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No reservations yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
