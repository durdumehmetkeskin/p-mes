import { useGo, useList, useResourceParams, useShow } from "@refinedev/core";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { RouteShowSheet } from "@/components/refine-ui/views/route-show-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ZoneRecord {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  isActive: boolean;
  warehouse: { code: string; name: string } | null;
  project: { code?: string; name?: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface RackRow {
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

export const ZonesShow = () => {
  const { id } = useResourceParams();
  const go = useGo();
  const { query } = useShow<ZoneRecord>();
  const record = query.data?.data;
  const isLoading = query.isLoading;

  const { result: racks } = useList<RackRow>({
    resource: "racks",
    filters: [{ field: "zoneId", operator: "eq", value: id }],
    sorters: [{ field: "code", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(id) },
  });
  const rackRows = racks?.data ?? [];

  return (
    <RouteShowSheet
      title={record ? `${record.code}${record.name ? ` · ${record.name}` : ""}` : "Zone"}
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
              <Field label="Warehouse">
                {record.warehouse
                  ? `${record.warehouse.code} · ${record.warehouse.name}`
                  : "—"}
              </Field>
              <Field label="Project">
                {record.project
                  ? [record.project.code, record.project.name]
                      .filter(Boolean)
                      .join(" · ")
                  : "—"}
              </Field>
              <Field label="Description">{record.description ?? "—"}</Field>
              <Field label="Status">
                <StatusBadge tone={record.isActive ? "success" : "neutral"} label={record.isActive ? "Active" : "Inactive"} />
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      {/* Racks within this zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Racks</span>
            <span className="text-sm font-normal text-muted-foreground">
              {rackRows.length} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rackRows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rackRows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() =>
                      go({ to: { resource: "racks", action: "show", id: r.id } })
                    }
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-2">{r.code}</td>
                    <td className="py-2">{r.name ?? "—"}</td>
                    <td className="py-2">
                      <StatusBadge tone={r.isActive ? "success" : "neutral"} label={r.isActive ? "Active" : "Inactive"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No racks defined for this zone.
            </p>
          )}
        </CardContent>
      </Card>
    </RouteShowSheet>
  );
};
