import { useShow } from "@refinedev/core";

import { RouteShowSheet } from "@/components/refine-ui/views/route-show-sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  roles: string[];
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

export const UsersShow = () => {
  const { query } = useShow<UserRecord>();
  const record = query.data?.data;
  const isLoading = query.isLoading;

  return (
    <RouteShowSheet title={record ? record.name : "User"}>
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
              <Field label="ID">{record.id}</Field>
              <Field label="Email">{record.email}</Field>
              <Field label="Name">{record.name}</Field>
              <Field label="Roles">
                <span className="flex flex-wrap gap-1">
                  {record.roles?.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                </span>
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
