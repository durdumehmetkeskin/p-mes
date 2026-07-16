import type { BaseRecord } from "@refinedev/core";
import type { Control, FieldValues } from "react-hook-form";
import { View } from "react-native";

import {
  RelationSelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";

const userLabel = (u: BaseRecord) =>
  [u.name, u.email].filter(Boolean).join(" · ");

export function WarehouseFormFields({
  control,
}: {
  control: Control<FieldValues>;
}) {
  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="code"
        label="Code"
        placeholder="WH-01"
        autoCapitalize="characters"
        rules={{ required: "Code is required" }}
      />
      <TextField
        control={control}
        name="name"
        label="Name"
        rules={{ required: "Name is required" }}
      />
      <TextField control={control} name="address" label="Address" />
      <TextAreaField control={control} name="description" label="Description" />
      <RelationSelectField
        control={control}
        name="responsibleUserId"
        label="Responsible (optional)"
        resource="users"
        getLabel={userLabel}
        allowClear
      />
      <SwitchField control={control} name="isActive" label="Active" />
    </View>
  );
}
