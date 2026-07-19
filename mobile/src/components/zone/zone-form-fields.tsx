import { useEffect, useState } from "react";
import { type BaseRecord, useList } from "@refinedev/core";
import type { Control, FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";
import { View } from "react-native";

import {
  FieldWrapper,
  RelationSelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { labelWarehouse } from "@/lib/labels";

const labelProject = (p: BaseRecord) =>
  [p.code, p.name].filter(Boolean).join(" · ");

export function ZoneFormFields({ control }: { control: Control<FieldValues> }) {
  // The project is picked THROUGH its customer: customer first, then only that
  // customer's projects. The customer itself is UI-only (zones store projectId).
  const project = useController({
    control,
    name: "projectId",
    defaultValue: null,
  });
  const [customerId, setCustomerId] = useState<string | null>(null);

  const { result: customers } = useList<BaseRecord>({
    resource: "customers",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const { result: projects } = useList<BaseRecord>({
    resource: "projects",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });

  // Edit case: seed the customer from the already-assigned project.
  const projectValue = project.field.value
    ? String(project.field.value)
    : null;
  useEffect(() => {
    if (customerId || !projectValue) return;
    const p = (projects?.data ?? []).find(
      (x) => String(x.id) === projectValue,
    );
    if (p?.customerCompanyId) setCustomerId(String(p.customerCompanyId));
  }, [customerId, projectValue, projects]);

  const customerOptions: SelectOption[] = (customers?.data ?? []).map((c) => ({
    value: String(c.id),
    label: [c.code, c.name].filter(Boolean).join(" · ") || String(c.id),
  }));
  const projectOptions: SelectOption[] = customerId
    ? (projects?.data ?? [])
        .filter((p) => String(p.customerCompanyId ?? "") === customerId)
        .map((p) => ({ value: String(p.id), label: labelProject(p) }))
    : [];

  return (
    <View className="gap-4">
      <RelationSelectField
        control={control}
        name="warehouseId"
        label="Warehouse"
        resource="warehouses"
        getLabel={labelWarehouse}
        placeholder="Select warehouse"
        rules={{ required: "Warehouse is required" }}
      />
      <TextField
        control={control}
        name="code"
        label="Code"
        placeholder="Z-01"
        autoCapitalize="characters"
        rules={{ required: "Code is required" }}
      />
      <TextField control={control} name="name" label="Name" />
      <FieldWrapper label="Customer (optional)">
        <SearchableSelect
          value={customerId}
          onChange={(v) => {
            setCustomerId(v);
            // A project belongs to one customer — reset on customer change.
            project.field.onChange(null);
          }}
          options={customerOptions}
          placeholder="Select customer"
          allowClear
        />
      </FieldWrapper>
      <FieldWrapper label="Project (optional)">
        <SearchableSelect
          value={projectValue}
          onChange={project.field.onChange}
          options={projectOptions}
          placeholder={
            customerId ? "Select project" : "Select a customer first"
          }
          allowClear
        />
      </FieldWrapper>
      <TextAreaField control={control} name="description" label="Description" />
      <SwitchField control={control} name="isActive" label="Active" />
    </View>
  );
}
