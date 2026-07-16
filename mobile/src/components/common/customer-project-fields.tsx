import { useEffect, useRef } from "react";
import { type BaseRecord, useList } from "@refinedev/core";
import {
  type Control,
  type FieldValues,
  useController,
  useWatch,
} from "react-hook-form";

import { FieldWrapper, RelationSelectField } from "@/components/refine-ui/form";
import { SearchableSelect } from "@/components/ui/searchable-select";

const codeName = (o: BaseRecord) =>
  [o.code, o.name].filter(Boolean).join(" · ");

/**
 * Optional customer + project pickers. The project list is filtered to the
 * selected customer's projects (pick the customer first); changing the customer
 * clears a now-invalid project.
 */
export function CustomerProjectFields({
  control,
}: {
  control: Control<FieldValues>;
}) {
  const selectedCustomer = useWatch({ control, name: "customerId" }) as
    | string
    | null
    | undefined;

  const project = useController({
    control,
    name: "projectId",
    defaultValue: null,
  });

  // Reset the project when the customer changes (a project belongs to one
  // customer). Only clears when switching FROM a real customer, so an edit
  // form's async load (undefined → value) keeps its project.
  const prev = useRef(selectedCustomer);
  useEffect(() => {
    if (prev.current !== selectedCustomer) {
      const wasReal = prev.current != null;
      prev.current = selectedCustomer;
      if (wasReal) project.field.onChange(null);
    }
  }, [selectedCustomer, project.field]);

  const { result: projects } = useList<BaseRecord>({
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
    queryOptions: { enabled: !!selectedCustomer, retry: false },
    errorNotification: false,
  });
  const projectOptions = (projects?.data ?? []).map((p) => ({
    label: codeName(p),
    value: String(p.id),
  }));

  return (
    <>
      <RelationSelectField
        control={control}
        name="customerId"
        label="Customer (optional)"
        resource="customers"
        getLabel={codeName}
        allowClear
      />
      <FieldWrapper label="Project (optional)">
        <SearchableSelect
          value={project.field.value ? String(project.field.value) : null}
          onChange={project.field.onChange}
          options={projectOptions}
          placeholder={
            selectedCustomer ? "Select a project" : "Select a customer first"
          }
          disabled={!selectedCustomer}
          allowClear
        />
      </FieldWrapper>
    </>
  );
}
