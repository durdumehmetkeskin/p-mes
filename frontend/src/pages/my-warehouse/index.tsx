import {
  useApiUrl,
  useCustom,
  useInvalidate,
  useList,
  useNotification,
} from "@refinedev/core";
import { Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { AxiosError } from "axios";

import { StockActionsToolbar } from "@/components/inventory/stock-actions-toolbar";
import { ReceiveReturnDialog } from "@/components/inventory/receive-return-dialog";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWarehouseAccess } from "@/providers/access-control";
import { axiosInstance } from "@/providers/axios";
import { useIsAdmin } from "@/hooks/use-is-admin";

interface WarehouseRow {
  id: string;
  code: string;
  name: string;
}
interface StockItem {
  id: string;
  quantity: number;
  status: string;
  warehouseId: string;
  warehouse: { code: string } | null;
  rack: {
    code: string;
    order: { orderNumber: string } | null;
    zone: { code: string; project: { code: string; name: string } | null } | null;
  } | null;
  order: { orderNumber: string } | null;
  stage: { name: string } | null;
  lot: {
    lotNumber: string;
    material: { code: string; name: string } | null;
    project: { code: string; name: string } | null;
  } | null;
  deliveredAt: string | null;
  receivedAt: string | null;
  returnedAt: string | null;
}
interface ToolReservation {
  id: string;
  status: string;
  /** False while the tool is in use / mid-handover elsewhere — hide Deliver. */
  deliverable?: boolean;
  tool: { id: string; code: string; name: string } | null;
  stage: { name: string; status: string } | null;
  order: { orderNumber: string } | null;
  project: { code: string; name: string } | null;
}
interface ToolRow {
  id: string;
  code: string;
  name: string;
  status: string;
  rack: { code: string; zone?: { warehouse?: { code?: string } | null } | null } | null;
}
interface MovementRow {
  id: string;
  type: string;
  quantity: number;
  createdAt: string;
  material: { code: string } | null;
  from?: string;
  to?: string;
}

const REFRESH = ["stock-items", "inventory-balances", "tools", "lots"];
const loc = (wh?: string | null, zone?: string | null, rack?: string | null) =>
  [wh, zone, rack].filter(Boolean).join(" / ") || "—";

export const MyWarehouse = () => {
  const { open: notify } = useNotification();
  const invalidate = useInvalidate();
  const isAdmin = useIsAdmin();
  const [access, setAccess] = useState<{
    isAdmin: boolean;
    responsibleWarehouseIds: string[];
  } | null>(null);
  const [detail, setDetail] = useState<StockItem | null>(null);

  useEffect(() => {
    void getWarehouseAccess().then(setAccess);
  }, []);

  const { result: warehouses } = useList<WarehouseRow>({
    resource: "warehouses",
    pagination: { mode: "off" },
    sorters: [{ field: "code", order: "asc" }],
  });
  const mine = useMemo(() => {
    const all = warehouses?.data ?? [];
    if (!access) return [];
    if (access.isAdmin) return all;
    const ids = new Set(access.responsibleWarehouseIds);
    return all.filter((w) => ids.has(w.id));
  }, [warehouses?.data, access]);

  const [warehouseId, setWarehouseId] = useState<string>("");
  useEffect(() => {
    if (!warehouseId && mine.length) setWarehouseId(mine[0].id);
  }, [mine, warehouseId]);

  const enabled = Boolean(warehouseId);
  const whFilter = enabled
    ? [{ field: "warehouseId", operator: "eq" as const, value: warehouseId }]
    : [];

  const { result: stock, query: stockQuery } = useList<StockItem>({
    resource: "stock-items",
    pagination: { mode: "off" },
    filters: whFilter,
    queryOptions: { enabled },
  });
  const { result: toolsRes, query: toolsQuery } = useList<ToolRow>({
    resource: "tools",
    pagination: { mode: "off" },
    filters: whFilter,
    queryOptions: { enabled },
  });
  const { result: movements } = useList<MovementRow>({
    resource: "inventory-transactions",
    pagination: { pageSize: 50 },
    sorters: [{ field: "createdAt", order: "desc" }],
    filters: whFilter,
    queryOptions: { enabled },
  });
  const apiBase = useApiUrl();
  const { result: toolResv, query: toolResvQuery } = useCustom<ToolReservation[]>({
    url: `${apiBase}/tool-reservations`,
    method: "get",
    config: {
      query: { status: "reserved,returning", warehouseId: warehouseId || undefined },
    },
    errorNotification: false,
    queryOptions: { enabled, retry: false },
  });

  const refreshAll = () => {
    REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
    void stockQuery.refetch();
    void toolsQuery.refetch();
    void toolResvQuery.refetch();
  };

  const act = async (url: string, okMsg: string) => {
    try {
      await axiosInstance.post(url);
      notify?.({ type: "success", message: okMsg });
      refreshAll();
    } catch (err) {
      const msg = (err as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
      notify?.({ type: "error", message: Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error") });
    }
  };

  const items = stock?.data ?? [];
  const toolRows = toolsRes?.data ?? [];
  const movementRows = movements?.data ?? [];
  const toolResvRows = Array.isArray(toolResv?.data) ? toolResv.data : [];

  const byStatus = (s: string) => items.filter((i) => i.status === s);
  const prepare = byStatus("reserving");
  const deliverM = byStatus("reserved");
  const returnM = byStatus("returning");
  const deliverT = toolResvRows.filter((r) => r.status === "reserved");
  const returnT = toolResvRows.filter((r) => r.status === "returning");
  const pendingCount =
    prepare.length + deliverM.length + returnM.length + deliverT.length + returnT.length;
  const scanHint = <span className="text-xs text-muted-foreground">Scan QR (mobile)</span>;

  const matLabel = (i: StockItem) =>
    `${i.lot?.material?.code ?? "—"} · ${i.lot?.lotNumber ?? ""}`;
  const forLabel = (order?: { orderNumber: string } | null, stage?: { name: string } | null) =>
    [order?.orderNumber, stage?.name].filter(Boolean).join(" · ") || "—";

  return (
    <ListView>
      <ListViewHeader title="My Warehouse" />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label htmlFor="myWarehouse">Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger id="myWarehouse">
                <SelectValue placeholder="Select a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {mine.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.code} · {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {enabled ? <StockActionsToolbar /> : null}
        </CardContent>
      </Card>

      {!mine.length ? (
        <div className="rounded-lg border py-16 text-center text-sm text-muted-foreground">
          You are not responsible for any warehouse.
        </div>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">Pending{pendingCount ? ` (${pendingCount})` : ""}</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
          </TabsList>

          {/* ---- Pending work ---- */}
          <TabsContent value="pending" className="space-y-4">
            {pendingCount === 0 ? (
              <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
                Nothing pending. 🎉
              </div>
            ) : null}

            {prepare.length > 0 && (
              <QueueCard title={`Prepare materials (${prepare.length})`}>
                {prepare.map((i) => (
                  <QueueRow
                    key={i.id}
                    main={matLabel(i)}
                    sub={`${i.quantity} · ${forLabel(i.order, i.stage)}`}
                    action={
                      <Button size="sm" onClick={() => void act(`/stock-items/${i.id}/confirm-reserve`, "Prepared")}>
                        Confirm
                      </Button>
                    }
                  />
                ))}
              </QueueCard>
            )}

            {deliverM.length > 0 && (
              <QueueCard title={`Deliver materials (${deliverM.length})`}>
                {deliverM.map((i) => (
                  <QueueRow
                    key={i.id}
                    main={matLabel(i)}
                    sub={`${i.quantity} · ${forLabel(i.order, i.stage)}`}
                    action={
                      isAdmin ? (
                        <Button size="sm" onClick={() => void act(`/stock-items/${i.id}/deliver`, "Delivered")}>
                          Deliver
                        </Button>
                      ) : (
                        scanHint
                      )
                    }
                  />
                ))}
              </QueueCard>
            )}

            {returnM.length > 0 && (
              <QueueCard title={`Material returns (${returnM.length})`}>
                {returnM.map((i) => (
                  <QueueRow
                    key={i.id}
                    main={matLabel(i)}
                    sub={`${i.quantity} · ${forLabel(i.order, i.stage)}`}
                    action={
                      isAdmin ? (
                        <ReceiveReturnDialog
                          item={{ id: i.id, quantity: i.quantity, warehouseId: i.warehouseId }}
                          onDone={refreshAll}
                        />
                      ) : (
                        scanHint
                      )
                    }
                  />
                ))}
              </QueueCard>
            )}

            {deliverT.length > 0 && (
              <QueueCard title={`Deliver tools (${deliverT.length})`}>
                {deliverT.map((r) => (
                  <QueueRow
                    key={r.id}
                    main={`${r.tool?.code ?? "—"} · ${r.tool?.name ?? ""}`}
                    sub={forLabel(r.order, r.stage)}
                    action={
                      r.deliverable === false ? (
                        <span className="text-xs text-muted-foreground">
                          Araç şu an müsait değil
                        </span>
                      ) : isAdmin ? (
                        <Button size="sm" onClick={() => void act(`/tool-reservations/${r.id}/deliver`, "Delivered")}>
                          Deliver
                        </Button>
                      ) : (
                        scanHint
                      )
                    }
                  />
                ))}
              </QueueCard>
            )}

            {returnT.length > 0 && (
              <QueueCard title={`Tool returns (${returnT.length})`}>
                {returnT.map((r) => (
                  <QueueRow
                    key={r.id}
                    main={`${r.tool?.code ?? "—"} · ${r.tool?.name ?? ""}`}
                    sub={forLabel(r.order, r.stage)}
                    action={
                      isAdmin ? (
                        <Button size="sm" onClick={() => void act(`/tool-reservations/${r.id}/receive-return`, "Received")}>
                          Receive return
                        </Button>
                      ) : (
                        scanHint
                      )
                    }
                  />
                ))}
              </QueueCard>
            )}
          </TabsContent>

          {/* ---- Stock (reservation-detailed) ---- */}
          <TabsContent value="stock">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material · Lot</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reserved for</TableHead>
                    <TableHead>Project</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.filter((i) => i.status !== "consumed").length ? (
                    items
                      .filter((i) => i.status !== "consumed")
                      .map((i) => (
                        <TableRow
                          key={i.id}
                          className="cursor-pointer"
                          onClick={() => setDetail(i)}
                        >
                          <TableCell>{matLabel(i)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {loc(i.warehouse?.code, i.rack?.zone?.code, i.rack?.code)}
                          </TableCell>
                          <TableCell className="text-right font-mono">{i.quantity}</TableCell>
                          <TableCell>
                            <StatusBadge label={i.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {forLabel(i.order, i.stage)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {i.lot?.project?.code ?? i.rack?.zone?.project?.code ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No stock in this warehouse.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ---- Tools ---- */}
          <TabsContent value="tools">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {toolRows.length ? (
                    toolRows.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-primary">
                          <Link to={`/tools/${t.id}`}>{t.code}</Link>
                        </TableCell>
                        <TableCell>
                          <Link to={`/tools/${t.id}`}>{t.name}</Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {loc(t.rack?.zone?.warehouse?.code, undefined, t.rack?.code)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge label={t.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No tools in this warehouse.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ---- Movements ---- */}
          <TabsContent value="movements">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementRows.length ? (
                    movementRows.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(m.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <StatusBadge label={m.type} />
                        </TableCell>
                        <TableCell>{m.material?.code ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono">{m.quantity}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {[m.from, m.to].filter(Boolean).join(" → ") || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void act(`/inventory-transactions/${m.id}/reverse`, "Movement reversed")
                            }
                          >
                            <Undo2 className="mr-1 h-4 w-4" />
                            Reverse
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No movements for this warehouse.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* ---- Stock item detail ---- */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {detail ? `${detail.lot?.material?.code ?? "—"} · Lot ${detail.lot?.lotNumber ?? ""}` : "Stock item"}
            </DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="flex flex-col gap-2 text-sm">
              <DetailRow label="Material" value={detail.lot?.material ? `${detail.lot.material.code} · ${detail.lot.material.name}` : "—"} />
              <DetailRow label="Quantity" value={`${detail.quantity}`} />
              <DetailRow label="Status" value={<StatusBadge label={detail.status} />} />
              <DetailRow label="Warehouse" value={detail.warehouse?.code ?? "—"} />
              <DetailRow label="Zone" value={detail.rack?.zone?.code ?? "—"} />
              <DetailRow label="Zone project" value={detail.rack?.zone?.project ? `${detail.rack.zone.project.code} · ${detail.rack.zone.project.name}` : "—"} />
              <DetailRow label="Rack" value={detail.rack?.code ?? "—"} />
              <DetailRow label="Rack dedicated order" value={detail.rack?.order?.orderNumber ?? "—"} />
              <DetailRow label="Lot project" value={detail.lot?.project ? `${detail.lot.project.code} · ${detail.lot.project.name}` : "—"} />
              <DetailRow label="Reserved for order" value={detail.order?.orderNumber ?? "—"} />
              <DetailRow label="Reserved for stage" value={detail.stage?.name ?? "—"} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </ListView>
  );
};

function QueueCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border">
      <div className="border-b px-3 py-2 text-sm font-medium">{title}</div>
      <div className="divide-y">{children}</div>
    </div>
  );
}
function QueueRow({
  main,
  sub,
  action,
}: {
  main: string;
  sub: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm">{main}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      {action}
    </div>
  );
}
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2">{value}</span>
    </div>
  );
}
