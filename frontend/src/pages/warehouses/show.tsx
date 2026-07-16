import { useGo, useList, useResourceParams, useShow } from "@refinedev/core";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { RouteShowSheet } from "@/components/refine-ui/views/route-show-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  address: string | null;
  responsibleUser: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ZoneRow {
  id: string;
  code: string;
  name: string | null;
  isActive: boolean;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

export const WarehousesShow = () => {
  const { id } = useResourceParams();
  const go = useGo();
  const { query } = useShow<WarehouseRecord>();
  const record = query.data?.data;
  const isLoading = query.isLoading;

  const { result: zones } = useList<ZoneRow>({
    resource: "zones",
    filters: [{ field: "warehouseId", operator: "eq", value: id }],
    sorters: [{ field: "code", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(id) },
  });
  const zoneRows = zones?.data ?? [];

  return (
    <RouteShowSheet title={record ? `${record.code} · ${record.name}` : "Warehouse"}>
      <Card>
        <CardContent className="pt-6">
          {isLoading || !record ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : (
            <>
              <Field label="Code">{record.code}</Field>
              <Field label="Name">{record.name}</Field>
              <Field label="Address">{record.address ?? "—"}</Field>
              <Field label="Description">{record.description ?? "—"}</Field>
              <Field label="Responsible">
                {record.responsibleUser?.name ?? "—"}
              </Field>
              <Field label="Status">
                <StatusBadge tone={record.isActive ? "success" : "neutral"} label={record.isActive ? "Active" : "Inactive"} />
              </Field>
              <Field label="Created">
                {new Date(record.createdAt).toLocaleString()}
              </Field>
              <Field label="Updated">
                {new Date(record.updatedAt).toLocaleString()}
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      {/* Zones within this warehouse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Zones</span>
            <span className="text-sm font-normal text-muted-foreground">
              {zoneRows.length} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {zoneRows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {zoneRows.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() =>
                      go({ to: { resource: "zones", action: "show", id: l.id } })
                    }
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-2">{l.code}</td>
                    <td className="py-2">{l.name ?? "—"}</td>
                    <td className="py-2">
                      <StatusBadge tone={l.isActive ? "success" : "neutral"} label={l.isActive ? "Active" : "Inactive"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No zones defined for this warehouse.
            </p>
          )}
        </CardContent>
      </Card>
    </RouteShowSheet>
  );
};
