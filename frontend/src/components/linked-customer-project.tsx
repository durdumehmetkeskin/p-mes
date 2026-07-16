import { useOne } from "@refinedev/core";

interface Named {
  id: string;
  code?: string;
  name?: string;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{value}</span>
    </div>
  );
}

/** Read-only Customer + Project rows for a material/tool detail sheet. */
export function LinkedCustomerProject({
  customerId,
  projectId,
}: {
  customerId?: string | null;
  projectId?: string | null;
}) {
  const { result: customer } = useOne<Named>({
    resource: "customers",
    id: customerId ?? "",
    queryOptions: { enabled: Boolean(customerId) },
  });
  const { result: project } = useOne<Named>({
    resource: "projects",
    id: projectId ?? "",
    queryOptions: { enabled: Boolean(projectId) },
  });
  const label = (o?: Named) =>
    o ? `${o.code ? `${o.code} · ` : ""}${o.name ?? ""}` : "—";

  return (
    <>
      <Row label="Customer" value={customerId ? label(customer) : "—"} />
      <Row label="Project" value={projectId ? label(project) : "—"} />
    </>
  );
}
