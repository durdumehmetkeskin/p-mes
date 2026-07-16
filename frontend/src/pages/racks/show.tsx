import { useList, useResourceParams, useShow } from "@refinedev/core";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { RouteShowSheet } from "@/components/refine-ui/views/route-show-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RackRecord {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  isActive: boolean;
  zone: {
    code: string;
    warehouse?: { code?: string; name?: string } | null;
  } | null;
  order: { orderNumber: string; name?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

interface BalanceRow {
  id: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  material: { code: string; name: string } | null;
  lot: { lotNumber: string } | null;
}
interface ToolRow {
  id: string;
  code: string;
  name: string;
  category: string;
  status: string;
  quantity: number;
}

const TOOL_CATEGORY_LABEL: Record<string, string> = {
  mold: "Mold",
  fixture: "Fixture",
  apparatus: "Apparatus",
  cutting_tool: "Cutting Tool",
  measurement_equipment: "Measurement Equipment",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

export const RacksShow = () => {
  const { id } = useResourceParams();
  const { query } = useShow<RackRecord>();
  const record = query.data?.data;
  const isLoading = query.isLoading;

  const { result: balances } = useList<BalanceRow>({
    resource: "inventory-balances",
    filters: [{ field: "rackId", operator: "eq", value: id }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(id) },
  });
  const rows = balances?.data ?? [];

  const { result: tools } = useList<ToolRow>({
    resource: "tools",
    filters: [{ field: "rackId", operator: "eq", value: id }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(id) },
  });
  const toolRows = tools?.data ?? [];

  const zonePath = record?.zone
    ? [record.zone.warehouse?.code, record.zone.code].filter(Boolean).join(" / ")
    : "—";

  return (
    <RouteShowSheet
      title={record ? `${record.code}${record.name ? ` · ${record.name}` : ""}` : "Rack"}
    >
      <Card>
        <CardContent className="pt-6">
          {isLoading || !record ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : (
            <>
              <Field label="Code">{record.code}</Field>
              <Field label="Name">{record.name ?? "—"}</Field>
              <Field label="Zone">{zonePath}</Field>
              <Field label="Dedicated order">
                {record.order?.orderNumber ?? "—"}
              </Field>
              <Field label="Description">{record.description ?? "—"}</Field>
              <Field label="Status">
                <StatusBadge tone={record.isActive ? "success" : "neutral"} label={record.isActive ? "Active" : "Inactive"} />
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      {/* Materials stored in this rack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Materials in this rack</span>
            <span className="text-sm font-normal text-muted-foreground">
              {rows.length} item{rows.length === 1 ? "" : "s"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Material</th>
                  <th className="pb-2 font-medium">Lot</th>
                  <th className="pb-2 font-medium text-right">Current</th>
                  <th className="pb-2 font-medium text-right">Reserved</th>
                  <th className="pb-2 font-medium text-right">Available</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2">
                      {b.material
                        ? `${b.material.code} · ${b.material.name}`
                        : "—"}
                    </td>
                    <td className="py-2">{b.lot?.lotNumber ?? "—"}</td>
                    <td className="py-2 text-right">{b.currentStock}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {b.reservedStock}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {b.availableStock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No stock in this rack.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tools stored in this rack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Tools in this rack</span>
            <span className="text-sm font-normal text-muted-foreground">
              {toolRows.length} item{toolRows.length === 1 ? "" : "s"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {toolRows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {toolRows.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2">{t.code}</td>
                    <td className="py-2">{t.name}</td>
                    <td className="py-2">
                      {TOOL_CATEGORY_LABEL[t.category] ?? t.category}
                    </td>
                    <td className="py-2">
                      <StatusBadge label={String(t.status).replace(/_/g, " ")} />
                    </td>
                    <td className="py-2 text-right">{t.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tools in this rack.
            </p>
          )}
        </CardContent>
      </Card>
    </RouteShowSheet>
  );
};
