import type { Control, FieldValues } from "react-hook-form";
import { View } from "react-native";

import {
  NumberField,
  RelationSelectField,
  ResourceSelectField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";
import { CustomerProjectFields } from "@/components/common/customer-project-fields";
import { TOOL_CATEGORIES, TOOL_STATUSES } from "@/components/tool/tool-constants";
import { labelRack } from "@/lib/labels";

export function ToolFormFields({ control }: { control: Control<FieldValues> }) {
  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="code"
        label="Code"
        placeholder="TOOL-001"
        autoCapitalize="characters"
        rules={{ required: "Code is required" }}
      />
      <TextField
        control={control}
        name="name"
        label="Name"
        rules={{ required: "Name is required" }}
      />
      <SelectField
        control={control}
        name="category"
        label="Category"
        options={[...TOOL_CATEGORIES]}
        placeholder="Select category"
        rules={{ required: "Category is required" }}
      />
      <SelectField
        control={control}
        name="status"
        label="Status"
        options={[...TOOL_STATUSES]}
      />
      <ResourceSelectField
        control={control}
        name="toolTypeId"
        label="Tool type"
        resource="tool-types"
        placeholder="Select a type"
        allowClear
      />
      <CustomerProjectFields control={control} />
      <TextField control={control} name="manufacturer" label="Manufacturer" />
      <TextField control={control} name="serialNumber" label="Serial number" />
      <RelationSelectField
        control={control}
        name="rackId"
        label="Rack"
        resource="racks"
        getLabel={labelRack}
        placeholder="Select rack (optional)"
        allowClear
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <NumberField control={control} name="quantity" label="Quantity" />
        </View>
        <View className="flex-1">
          <NumberField
            control={control}
            name="maxLifeCycle"
            label="Max life cycle"
          />
        </View>
      </View>
      <TextField
        control={control}
        name="purchaseDate"
        label="Purchase date"
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      <TextField
        control={control}
        name="nextMaintenanceDate"
        label="Next maintenance"
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      <TextAreaField control={control} name="description" label="Description" />
      <SwitchField control={control} name="isActive" label="Active" />
    </View>
  );
}
