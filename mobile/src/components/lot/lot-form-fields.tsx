import type { Control, FieldValues } from "react-hook-form";
import { View } from "react-native";

import {
  RelationSelectField,
  TextField,
} from "@/components/refine-ui/form";
import { CustomerProjectFields } from "@/components/common/customer-project-fields";
import { labelMaterial, labelRack } from "@/lib/labels";

export function LotFormFields({ control }: { control: Control<FieldValues> }) {
  return (
    <View className="gap-4">
      <RelationSelectField
        control={control}
        name="materialId"
        label="Material"
        resource="materials"
        getLabel={labelMaterial}
        placeholder="Select material"
        rules={{ required: "Material is required" }}
      />
      {/* Lot number is generated automatically (LOT-YYYYMMDD-NNNN). */}
      <TextField
        control={control}
        name="expiryDate"
        label="Expiry date (SKT)"
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      <RelationSelectField
        control={control}
        name="rackId"
        label="Rack"
        resource="racks"
        getLabel={labelRack}
        placeholder="Select rack (optional)"
        allowClear
      />
      <CustomerProjectFields control={control} />
    </View>
  );
}
