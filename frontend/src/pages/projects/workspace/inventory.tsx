import { useGo } from "@refinedev/core";
import { AlertTriangle, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";

import { Can } from "@/components/can";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { axiosInstance } from "@/providers/axios";
import { ReorderDialog } from "./reorder-dialog";

interface MaterialRow {
  id: string;
  code: string;
  name: string;
  unit: string;
  available: number;
  reorderLevel: number | null;
}
interface ToolRow {
  id: string;
  code: string;
  name: string;
  status: string;
  quantity: number;
  rack: { code: string } | null;
}
interface DemandOrderRow {
  orderId: string;
  orderNumber: string;
  orderName: string | null;
  required: number;
  covered: number;
  remaining: number;
}
interface DemandRow {
  materialId: string;
  code: string;
  name: string;
  unit: string;
  requiredTotal: number;
  remainingTotal: number;
  available: number;
  missing: number;
  orders: DemandOrderRow[];
}

/**
 * Materials and tools allocated to this project, with the material's current
 * AVAILABLE stock (freely-available portion, not reserved). Served by the
 * project-scoped `/projects/:id/{materials,tools}` endpoints (visible to project
 * members, unlike the global inventory lists).
 */
export const ProjectInventory = () => {
  const { projectId } = useOutletContext<{ projectId: string }>();
  const go = useGo();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [demands, setDemands] = useState<DemandRow[]>([]);
  const [expandedDemands, setExpandedDemands] = useState<Set<string>>(
    new Set(),
  );

  const load = useCallback(() => {
    if (!projectId) return () => {};
    let active = true;
    void Promise.all([
      axiosInstance
        .get<MaterialRow[]>(`/projects/${projectId}/materials`)
        .then((r) => r.data)
        .catch(() => []),
      axiosInstance
        .get<ToolRow[]>(`/projects/${projectId}/tools`)
        .then((r) => r.data)
        .catch(() => []),
      axiosInstance
        .get<DemandRow[]>(`/projects/${projectId}/material-demands`)
        .then((r) => r.data)
        .catch(() => []),
    ]).then(([m, t, d]) => {
      if (!active) return;
      setMaterials(m ?? []);
      setTools(t ?? []);
      setDemands(d ?? []);
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => load(), [load]);

  const toggleDemand = (id: string) =>
    setExpandedDemands((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      {demands.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="inline-flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Demand list
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {demands.length} material{demands.length > 1 ? "s" : ""} short
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Material</th>
                  <th className="pb-2 font-medium text-right">Missing</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((d) => {
                  const expanded = expandedDemands.has(d.materialId);
                  return (
                    <Fragment key={d.materialId}>
                      <tr
                        onClick={() => toggleDemand(d.materialId)}
                        className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-2">
                          <span className="inline-flex items-center gap-1">
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-mono text-primary">
                              {d.code}
                            </span>{" "}
                            {d.name}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono font-medium text-destructive">
                          −{d.missing} {d.unit}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b last:border-0">
                          <td colSpan={2} className="bg-muted/20 p-0">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                  <th className="py-1.5 pl-8 font-medium">
                                    Order
                                  </th>
                                  <th className="py-1.5 font-medium text-right">
                                    Required
                                  </th>
                                  <th className="py-1.5 font-medium text-right">
                                    Reserved
                                  </th>
                                  <th className="py-1.5 pr-2 font-medium text-right">
                                    Remaining
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {d.orders.map((o) => (
                                  <tr
                                    key={o.orderId}
                                    className="border-b last:border-0"
                                  >
                                    <td className="py-1.5 pl-8">
                                      <Link
                                        to={`/projects/${projectId}/orders/${o.orderId}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-primary hover:underline"
                                      >
                                        {o.orderNumber}
                                        {o.orderName ? ` · ${o.orderName}` : ""}
                                      </Link>
                                    </td>
                                    <td className="py-1.5 text-right font-mono">
                                      {o.required} {d.unit}
                                    </td>
                                    <td className="py-1.5 text-right font-mono">
                                      {o.covered} {d.unit}
                                    </td>
                                    <td className="py-1.5 pr-2 text-right font-mono text-destructive">
                                      {o.remaining} {d.unit}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Materials</span>
            <span className="text-sm font-normal text-muted-foreground">
              {materials.length} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium text-right">Available</th>
                  <th className="pb-2 font-medium text-right">Reorder</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const low =
                    m.reorderLevel != null &&
                    m.reorderLevel > 0 &&
                    m.available < m.reorderLevel;
                  return (
                    <tr
                      key={m.id}
                      onClick={() =>
                        go({ to: `/projects/${projectId}/materials/${m.id}` })
                      }
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-2 font-mono text-primary">{m.code}</td>
                      <td className="py-2">{m.name}</td>
                      <td className="py-2 text-muted-foreground">{m.unit}</td>
                      <td className="py-2 text-right font-mono">
                        <span className="inline-flex items-center justify-end gap-2">
                          {m.available}
                          {low && <StatusBadge tone="error" label="low" />}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-muted-foreground">
                        {m.reorderLevel != null && m.reorderLevel > 0
                          ? m.reorderLevel
                          : "—"}
                      </td>
                      <td
                        className="py-2 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Can perm="projects:update">
                          <ReorderDialog
                            projectId={projectId}
                            materialId={m.id}
                            materialLabel={`${m.code} · ${m.name}`}
                            current={m.reorderLevel}
                            onSaved={load}
                            trigger={
                              <Button size="icon" variant="ghost">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </Can>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No materials allocated to this project.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Tools</span>
            <span className="text-sm font-normal text-muted-foreground">
              {tools.length} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tools.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Rack</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() =>
                      go({ to: { resource: "tools", action: "show", id: t.id } })
                    }
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-2 font-mono text-primary">{t.code}</td>
                    <td className="py-2">{t.name}</td>
                    <td className="py-2 text-muted-foreground">
                      {t.rack?.code ?? "—"}
                    </td>
                    <td className="py-2">
                      <StatusBadge label={String(t.status).replace(/_/g, " ")} />
                    </td>
                    <td className="py-2 text-right font-mono">{t.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tools allocated to this project.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
