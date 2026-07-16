import type { Control, FieldValues } from "react-hook-form";
import { View } from "react-native";

import {
  NumberField,
  ResourceSelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";

/** Shared field set for the material create/edit forms (RN port). */
export function MaterialFormFields({
  control,
  mode,
}: {
  control: Control<FieldValues>;
  /** create: product code is hidden (server-generated); edit: read-only. */
  mode: "create" | "edit";
}) {
  return (
    <View className="gap-4">
      {mode === "edit" && (
        // Server-generated (MAT-YYYY-NNNN); read-only, ignored on save.
        <TextField control={control} name="code" label="Product code" editable={false} />
      )}
      <TextField
        control={control}
        name="name"
        label="Name"
        rules={{ required: "Name is required" }}
      />
      <ResourceSelectField
        control={control}
        name="materialUnitId"
        label="Unit"
        resource="material-units"
        placeholder="Select unit"
        rules={{ required: "Unit is required" }}
      />
      <ResourceSelectField
        control={control}
        name="materialTypeId"
        label="Material type"
        resource="material-types"
        placeholder="Select a type"
        allowClear
      />
      <TextAreaField control={control} name="description" label="Description" />

      <NumberField
        control={control}
        name="dangerWeeks"
        label="Danger threshold (weeks to SKT)"
      />
      <NumberField
        control={control}
        name="warningWeeks"
        label="Warning threshold (weeks to SKT)"
      />

      <View className="gap-3 pt-1">
        <SwitchField control={control} name="isLotTracked" label="Lot tracked" />
        <SwitchField
          control={control}
          name="isSerialTracked"
          label="Serial tracked"
        />
        <SwitchField control={control} name="isActive" label="Active" />
      </View>
    </View>
  );
}
