import type { BaseRecord } from "@refinedev/core";
import type { Control, FieldValues } from "react-hook-form";
import { View } from "react-native";

import {
  RelationSelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";
import { labelWarehouse } from "@/lib/labels";

const labelProject = (p: BaseRecord) =>
  [p.code, p.name].filter(Boolean).join(" · ");

export function ZoneFormFields({ control }: { control: Control<FieldValues> }) {
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
      <RelationSelectField
        control={control}
        name="projectId"
        label="Project (optional)"
        resource="projects"
        getLabel={labelProject}
        allowClear
      />
      <TextAreaField control={control} name="description" label="Description" />
      <SwitchField control={control} name="isActive" label="Active" />
    </View>
  );
}
