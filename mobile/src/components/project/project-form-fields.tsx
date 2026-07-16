import type { BaseRecord } from "@refinedev/core";
import { type Control, type FieldValues, useWatch } from "react-hook-form";
import { View } from "react-native";

import {
  RelationSelectField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";

/** Fixed project statuses (mirrors the backend ProjectStatus enum). */
const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Passive", value: "passive" },
  { label: "Completed", value: "completed" },
  { label: "Canceled", value: "canceled" },
];

const userLabel = (u: BaseRecord) => [u.name, u.email].filter(Boolean).join(" · ");
const companyLabel = (c: BaseRecord) =>
  [c.code, c.name].filter(Boolean).join(" · ");
const contactLabel = (c: BaseRecord) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ");

export function ProjectFormFields({
  control,
  mode,
}: {
  control: Control<FieldValues>;
  /** create: code is hidden (server-generated); edit: shown read-only. */
  mode: "create" | "edit";
}) {
  const companyId = useWatch({ control, name: "customerCompanyId" });

  return (
    <View className="gap-4">
      {mode === "edit" && (
        // Server-generated (PRJ-YYYY-NNNN); read-only, ignored on save.
        <TextField control={control} name="code" label="Code" editable={false} />
      )}
      <TextField
        control={control}
        name="name"
        label="Name"
        rules={{ required: "Name is required" }}
      />
      <RelationSelectField
        control={control}
        name="managerUserId"
        label="Manager"
        resource="users"
        getLabel={userLabel}
        allowClear
      />
      <RelationSelectField
        control={control}
        name="customerCompanyId"
        label="Customer"
        resource="customers"
        getLabel={companyLabel}
        allowClear
      />
      <RelationSelectField
        control={control}
        name="contactPersonId"
        label="Contact"
        resource="contacts"
        getLabel={contactLabel}
        filters={
          companyId
            ? [{ field: "customerId", operator: "eq", value: companyId }]
            : undefined
        }
        allowClear
      />
      <TextField
        control={control}
        name="startDate"
        label="Start date"
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      <TextField
        control={control}
        name="endDate"
        label="End date"
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      <SelectField
        control={control}
        name="status"
        label="Status"
        options={STATUS_OPTIONS}
        placeholder="Active"
      />
      <TextAreaField control={control} name="description" label="Description" />
    </View>
  );
}
