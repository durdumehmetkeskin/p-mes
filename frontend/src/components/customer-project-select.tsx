import { useList } from "@refinedev/core";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";
type FormValues = Record<string, unknown>;
interface Opt {
  id: string;
  code?: string;
  name?: string;
}

const optionLabel = (o: Opt) =>
  `${o.code ? `${o.code} · ` : ""}${o.name ?? ""}`;

/**
 * Optional customer + project pickers, bound to `customerId` / `projectId`.
 * The project list is filtered to the selected customer's projects — pick the
 * customer first. Changing the customer clears a now-invalid project.
 */
export function CustomerProjectSelect({
  control,
}: {
  control: Control<FormValues>;
}) {
  const customer = useController({
    control,
    name: "customerId",
    defaultValue: null,
  });
  const project = useController({
    control,
    name: "projectId",
    defaultValue: null,
  });
  const selectedCustomer = customer.field.value
    ? String(customer.field.value)
    : "";

  const { result: customers } = useList<Opt>({
    resource: "customers",
    pagination: { mode: "off" },
  });
  const { result: projects } = useList<Opt>({
    resource: "projects",
    pagination: { mode: "off" },
    filters: selectedCustomer
      ? [
          {
            field: "customerCompanyId",
            operator: "eq",
            value: selectedCustomer,
          },
        ]
      : [],
    queryOptions: { enabled: Boolean(selectedCustomer) },
  });

  const onCustomerChange = (v: string) => {
    customer.field.onChange(v === NONE ? null : v);
    // A project only belongs to one customer — reset when the customer changes.
    project.field.onChange(null);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="customerId">Customer (optional)</Label>
        <Select
          value={selectedCustomer || NONE}
          onValueChange={onCustomerChange}
        >
          <SelectTrigger id="customerId">
            <SelectValue placeholder="Select a customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {(customers?.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {optionLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="projectId">Project (optional)</Label>
        <Select
          value={project.field.value ? String(project.field.value) : NONE}
          onValueChange={(v) => project.field.onChange(v === NONE ? null : v)}
          disabled={!selectedCustomer}
        >
          <SelectTrigger id="projectId">
            <SelectValue
              placeholder={
                selectedCustomer ? "Select a project" : "Select a customer first"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {(projects?.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {optionLabel(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
