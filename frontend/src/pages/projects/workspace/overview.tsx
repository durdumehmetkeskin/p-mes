import { useShow } from "@refinedev/core";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/refine-ui/status-badge";

interface ProjectRecord {
  code: string;
  name: string;
  description: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  managerUser: { name: string } | null;
  customerCompany: { code: string; name: string } | null;
  contactPerson: { firstName: string; lastName: string } | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

export const ProjectOverview = () => {
  const { query } = useShow<ProjectRecord>();
  const record = query.data?.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project details</CardTitle>
      </CardHeader>
      <CardContent>
        {!record ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : (
          <>
            <Field label="Code">{record.code}</Field>
            <Field label="Name">{record.name}</Field>
            <Field label="Manager">
              {record.managerUser?.name ?? "—"}
            </Field>
            <Field label="Customer">{record.customerCompany?.name ?? "—"}</Field>
            <Field label="Contact">
              {record.contactPerson
                ? `${record.contactPerson.firstName} ${record.contactPerson.lastName}`
                : "—"}
            </Field>
            <Field label="Status">
              {record.status ? <StatusBadge label={record.status} /> : "—"}
            </Field>
            <Field label="Dates">
              {[record.startDate, record.endDate].filter(Boolean).join(" → ") ||
                "—"}
            </Field>
            <Field label="Description">{record.description ?? "—"}</Field>
          </>
        )}
      </CardContent>
    </Card>
  );
};
