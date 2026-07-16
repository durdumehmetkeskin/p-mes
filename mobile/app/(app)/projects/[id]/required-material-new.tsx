import { View } from "react-native";
import { useInvalidate } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  NumberField,
  RelationSelectField,
  TextField,
} from "@/components/refine-ui/form";
import { ResourceForm } from "@/components/refine-ui/resource-form";
import { labelMaterial } from "@/lib/labels";

export default function RequiredMaterialFormScreen() {
  const { orderId, editId } = useLocalSearchParams<{
    id: string;
    orderId?: string;
    editId?: string;
  }>();
  const router = useRouter();
  const invalidate = useInvalidate();
  const isEdit = !!editId;

  return (
    <ResourceForm
      resource="order-material-requirements"
      action={isEdit ? "edit" : "create"}
      id={editId}
      title={isEdit ? "Edit required material" : "Add required material"}
      redirect={false}
      defaultValues={isEdit ? undefined : { orderId }}
      onSuccess={() => {
        invalidate({
          resource: "order-material-requirements",
          invalidates: ["list"],
        });
        if (router.canGoBack()) router.back();
      }}
    >
      {(control) => (
        <View className="gap-4">
          {!isEdit && (
            <RelationSelectField
              control={control}
              name="materialId"
              label="Material"
              resource="materials"
              getLabel={labelMaterial}
              placeholder="Select material"
              rules={{ required: "Material is required" }}
            />
          )}
          <NumberField
            control={control}
            name="requiredQuantity"
            label="Required quantity"
          />
          <TextField control={control} name="note" label="Note" />
        </View>
      )}
    </ResourceForm>
  );
}
