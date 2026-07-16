import { useGo } from "@refinedev/core";
import { ArrowLeft, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import { Can } from "@/components/can";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/providers/axios";
import { ReorderDialog } from "./reorder-dialog";

interface StockItemView {
  id: string;
  quantity: number;
  status:
    | "available"
    | "reserving"
    | "reserved"
    | "delivering"
    | "delivered"
    | "returning"
    | "consumed";
  warehouse: string | null;
  rack: string | null;
  order: string | null;
  stage: string | null;
}
interface LotView {
  id: string;
  lotNumber: string;
  expiryDate: string | null;
  status: string;
  stockItems: StockItemView[];
}
interface MovementView {
  id: string;
  type: string;
  quantity: number;
  createdAt: string;
  note: string | null;
  source: string | null;
  target: string | null;
  from: string;
  to: string;
}
interface Detail {
  material: {
    id: string;
    code: string;
    name: string;
    unit: string;
    description: string | null;
  };
  reorderLevel: number | null;
  lots: LotView[];
  movements: MovementView[];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

export const ProjectMaterialDetail = () => {
  const { id: projectId, materialId } = useParams();
  const go = useGo();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!projectId || !materialId) return () => {};
    let active = true;
    setLoading(true);
    void axiosInstance
      .get<Detail>(`/projects/${projectId}/materials/${materialId}`)
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, materialId]);

  useEffect(() => load(), [load]);

  const unit = data?.material.unit ?? "";
  const items = useMemo(
    () =>
      (data?.lots ?? []).flatMap((l) =>
        l.stockItems.map((si) => ({ ...si, lotNumber: l.lotNumber })),
      ),
    [data],
  );
  const reserved = items.filter((i) => i.status !== "available" && i.status !== "consumed");

  // Stock grouped by rack (this project's stock only).
  const byRack = useMemo(() => {
    const map = new Map<
      string,
      { rack: string; current: number; reserved: number; available: number }
    >();
    for (const si of items) {
      if (si.status === "consumed") continue;
      const key = si.rack ?? "—";
      const row = map.get(key) ?? {
        rack: key,
        current: 0,
        reserved: 0,
        available: 0,
      };
      row.current += si.quantity;
      if (si.status === "available") row.available += si.quantity;
      else row.reserved += si.quantity;
      map.set(key, row);
    }
    return [...map.values()];
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/projects/${projectId}/inventory`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Materials &amp; Tools
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading || !data ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : (
            <>
              <Field label="Code">{data.material.code}</Field>
              <Field label="Name">{data.material.name}</Field>
              <Field label="Unit">{data.material.unit}</Field>
              <Field label="Description">
                {data.material.description ?? "—"}
              </Field>
              <Field label="Reorder level">
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono">
                    {data.reorderLevel != null && data.reorderLevel > 0
                      ? `${data.reorderLevel} ${unit}`
                      : "—"}
                  </span>
                  <Can perm="projects:update">
                    <ReorderDialog
                      projectId={projectId ?? ""}
                      materialId={materialId ?? ""}
                      materialLabel={`${data.material.code} · ${data.material.name}`}
                      current={data.reorderLevel}
                      onSaved={load}
                      trigger={
                        <Button size="icon" variant="ghost" className="h-7 w-7">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                  </Can>
                </span>
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stock by rack — this project's stock only */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock by rack (this project)</CardTitle>
        </CardHeader>
        <CardContent>
          {byRack.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Rack</th>
                  <th className="pb-2 font-medium text-right">Current</th>
                  <th className="pb-2 font-medium text-right">Reserved</th>
                  <th className="pb-2 font-medium text-right">Available</th>
                </tr>
              </thead>
              <tbody>
                {byRack.map((r) => (
                  <tr key={r.rack} className="border-b last:border-0">
                    <td className="py-2">{r.rack}</td>
                    <td className="py-2 text-right">{r.current}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {r.reserved}
                    </td>
                    <td className="py-2 text-right font-medium">{r.available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No project stock for this material.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Project lots — click to open the lot (add stock / reserve) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Lots</span>
            <span className="text-sm font-normal text-muted-foreground">
              {data?.lots.length ?? 0} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.lots.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Lot number</th>
                  <th className="pb-2 font-medium">Expiry</th>
                  <th className="pb-2 font-medium">Expiry status</th>
                  <th className="pb-2 font-medium text-right">On hand</th>
                </tr>
              </thead>
              <tbody>
                {data.lots.map((l) => {
                  const onHand = l.stockItems
                    .filter((s) => s.status !== "consumed")
                    .reduce((s, i) => s + i.quantity, 0);
                  return (
                    <tr
                      key={l.id}
                      onClick={() =>
                        go({ to: { resource: "lots", action: "show", id: l.id } })
                      }
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-2">{l.lotNumber}</td>
                      <td className="py-2 text-muted-foreground">
                        {l.expiryDate ?? "—"}
                      </td>
                      <td className="py-2">
                        <StatusBadge label={String(l.status).replace(/_/g, " ")} />
                      </td>
                      <td className="py-2 text-right font-mono">
                        {onHand} {unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No lots for this material in this project.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reserved stock — this project's lots only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Reserved stock</span>
            <span className="text-sm font-normal text-muted-foreground">
              {reserved.length} reserved
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reserved.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Lot</th>
                  <th className="pb-2 font-medium">Rack</th>
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {reserved.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">{r.lotNumber}</td>
                    <td className="py-2 text-muted-foreground">
                      {r.rack ?? "—"}
                    </td>
                    <td className="py-2">{r.order ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">
                      {r.stage ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      {r.quantity} {unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No reserved stock for this project.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Movements — this project's lots only */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock movements</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.movements.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">From</th>
                  <th className="pb-2 font-medium">To</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {data.movements.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2">
                      <StatusBadge label={String(m.type).replace(/_/g, " ")} />
                    </td>
                    <td className="py-2 text-muted-foreground">{m.from}</td>
                    <td className="py-2 text-muted-foreground">{m.to}</td>
                    <td className="py-2 text-right">{m.quantity}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No movements for this project's lots.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
