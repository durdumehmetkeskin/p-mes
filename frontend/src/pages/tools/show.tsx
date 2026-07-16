import { useShow } from "@refinedev/core";

import { QrCodeDialog } from "@/components/qr/qr-code-dialog";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { RouteShowSheet } from "@/components/refine-ui/views/route-show-sheet";
import { LinkedCustomerProject } from "@/components/linked-customer-project";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toolCategoryLabel } from "./tool-form-fields";
import { ToolStatusCard } from "./tool-status-card";
import { ToolAssignmentCard } from "./tool-assignment-card";
import { ToolUsageCard } from "./tool-usage-card";
import { ToolCycleCard } from "./tool-cycle-card";
import { ToolReservationCalendarCard } from "./tool-reservation-calendar-card";

interface ToolRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  status: string;
  toolType: { id: string; name: string } | null;
  description: string | null;
  manufacturer: string | null;
  serialNumber: string | null;
  rack: { code: string; warehouse?: { code?: string } | null } | null;
  quantity: number;
  purchaseDate: string | null;
  nextMaintenanceDate: string | null;
  currentLifeCycle: number;
  maxLifeCycle: number | null;
  customerId: string | null;
  projectId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

export const ToolsShow = () => {
  const { query } = useShow<ToolRecord>();
  const record = query.data?.data;
  const isLoading = query.isLoading;

  return (
    <RouteShowSheet title={record ? `${record.code} · ${record.name}` : "Tool"}>
      {record && (
        <div className="flex justify-end">
          <QrCodeDialog
            resource="tools"
            id={record.id}
            code={record.code}
            title={record.name}
          />
        </div>
      )}

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
              <Field label="Category">
                {toolCategoryLabel(record.category)}
              </Field>
              <Field label="Type">{record.toolType?.name ?? "—"}</Field>
              <LinkedCustomerProject
                customerId={record.customerId}
                projectId={record.projectId}
              />
              <Field label="Manufacturer">{record.manufacturer ?? "—"}</Field>
              <Field label="Serial number">{record.serialNumber ?? "—"}</Field>
              <Field label="Rack">
                {record.rack
                  ? [record.rack.warehouse?.code, record.rack.code]
                      .filter(Boolean)
                      .join(" / ")
                  : "—"}
              </Field>
              <Field label="Quantity">{record.quantity}</Field>
              <Field label="Purchase date">{record.purchaseDate ?? "—"}</Field>
              <Field label="Next maintenance / calibration">
                {record.nextMaintenanceDate ?? "—"}
              </Field>
              <Field label="Description">{record.description ?? "—"}</Field>
              <Field label="Active">
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

      {record && (
        <ToolStatusCard tool={{ id: record.id, status: record.status }} />
      )}

      {record && <ToolAssignmentCard tool={{ id: record.id }} />}

      {record && <ToolUsageCard tool={{ id: record.id }} />}

      {record && (
        <ToolCycleCard
          tool={{
            id: record.id,
            currentLifeCycle: record.currentLifeCycle,
            maxLifeCycle: record.maxLifeCycle,
          }}
        />
      )}

      {record && <ToolReservationCalendarCard tool={{ id: record.id }} />}
    </RouteShowSheet>
  );
};
