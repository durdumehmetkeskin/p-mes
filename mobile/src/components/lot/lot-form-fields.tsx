import type { Control, FieldValues } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { View } from "react-native";

import {
  RelationSelectField,
  TextField,
} from "@/components/refine-ui/form";
import { CustomerProjectFields } from "@/components/common/customer-project-fields";
import { labelMaterial, labelRack } from "@/lib/labels";

export function LotFormFields({ control }: { control: Control<FieldValues> }) {
  // A project lot may only sit on the project's racks (stock items inherit the
  // lot's rack), so the rack options follow the chosen project.
  const projectId = useWatch({ control, name: "projectId" }) as
    | string
    | null
    | undefined;
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
        filterItem={(r) => {
          if (!projectId) return true;
          const zone = (r as { zone?: { projectId?: string | null } | null })
            .zone;
          return zone?.projectId === projectId;
        }}
        placeholder="Select rack (optional)"
        allowClear
      />
      <CustomerProjectFields control={control} />
    </View>
  );
}
