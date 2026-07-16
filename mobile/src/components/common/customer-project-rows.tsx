import { type BaseRecord, useOne } from "@refinedev/core";

import { FieldRow } from "@/components/refine-ui/field-row";

const codeName = (o?: BaseRecord) =>
  o ? [o.code, o.name].filter(Boolean).join(" · ") : undefined;

/** Read-only Customer + Project rows for a material/tool detail screen. */
export function CustomerProjectRows({
  customerId,
  projectId,
}: {
  customerId?: string | null;
  projectId?: string | null;
}) {
  const { result: customer } = useOne<BaseRecord>({
    resource: "customers",
    id: customerId ?? "",
    queryOptions: { enabled: !!customerId, retry: false },
    errorNotification: false,
  });
  const { result: project } = useOne<BaseRecord>({
    resource: "projects",
    id: projectId ?? "",
    queryOptions: { enabled: !!projectId, retry: false },
    errorNotification: false,
  });

  return (
    <>
      <FieldRow label="Customer" value={customerId ? codeName(customer) : undefined} />
      <FieldRow label="Project" value={projectId ? codeName(project) : undefined} />
    </>
  );
}
