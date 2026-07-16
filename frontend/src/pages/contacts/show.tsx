import { useGo, useResourceParams, useShow } from "@refinedev/core";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { RouteShowSheet } from "@/components/refine-ui/views/route-show-sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ContactRecord {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; code: string; name: string } | null;
}

function Field({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span
        className={
          onClick
            ? "col-span-2 text-sm cursor-pointer text-primary hover:underline"
            : "col-span-2 text-sm"
        }
        onClick={onClick}
      >
        {children}
      </span>
    </div>
  );
}

export const ContactsShow = () => {
  const { id } = useResourceParams();
  void id;
  const go = useGo();
  const { query } = useShow<ContactRecord>();
  const record = query.data?.data;
  const isLoading = query.isLoading;

  return (
    <RouteShowSheet
      title={
        record ? `${record.firstName} ${record.lastName}` : "Contact"
      }
    >
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
              <Field label="First name">{record.firstName}</Field>
              <Field label="Last name">{record.lastName}</Field>
              <Field
                label="Customer"
                onClick={
                  record.customer
                    ? () =>
                        go({
                          to: {
                            resource: "customers",
                            action: "show",
                            id: record.customer!.id,
                          },
                        })
                    : undefined
                }
              >
                {record.customer
                  ? `${record.customer.code} · ${record.customer.name}`
                  : "—"}
              </Field>
              <Field label="Role">{record.role ?? "—"}</Field>
              <Field label="Email">{record.email ?? "—"}</Field>
              <Field label="Phone">{record.phone ?? "—"}</Field>
              <Field label="Status">
                <StatusBadge
                  tone={record.isActive ? "success" : "neutral"}
                  label={record.isActive ? "Active" : "Inactive"}
                />
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
    </RouteShowSheet>
  );
};
