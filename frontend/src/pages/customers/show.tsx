import { useGo, useList, useResourceParams, useShow } from "@refinedev/core";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { RouteShowSheet } from "@/components/refine-ui/views/route-show-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ContactRow {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
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

export const CustomersShow = () => {
  const { id } = useResourceParams();
  const go = useGo();
  const { query } = useShow<CustomerRecord>();
  const record = query.data?.data;
  const isLoading = query.isLoading;

  const { result: contacts } = useList<ContactRow>({
    resource: "contacts",
    filters: [{ field: "customerId", operator: "eq", value: id }],
    sorters: [{ field: "createdAt", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(id) },
  });
  const contactRows = contacts?.data ?? [];

  return (
    <RouteShowSheet title={record ? `${record.code} · ${record.name}` : "Customer"}>
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
              <Field label="Tax number">{record.taxNumber ?? "—"}</Field>
              <Field label="Email">{record.email ?? "—"}</Field>
              <Field label="Phone">{record.phone ?? "—"}</Field>
              <Field label="Address">{record.address ?? "—"}</Field>
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

      {/* Contacts belonging to this customer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Contacts</span>
            <span className="text-sm font-normal text-muted-foreground">
              {contactRows.length} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contactRows.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {contactRows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() =>
                      go({ to: { resource: "contacts", action: "show", id: c.id } })
                    }
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-2">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="py-2">{c.role ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">{c.email ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">{c.phone ?? "—"}</td>
                    <td className="py-2">
                      <StatusBadge
                        tone={c.isActive ? "success" : "neutral"}
                        label={c.isActive ? "Active" : "Inactive"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No contacts yet.</p>
          )}
        </CardContent>
      </Card>
    </RouteShowSheet>
  );
};
