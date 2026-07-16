import { View } from "react-native";
import { useInvalidate } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  RelationSelectField,
  SwitchField,
  TextField,
} from "@/components/refine-ui/form";
import { ResourceForm } from "@/components/refine-ui/resource-form";

export default function StageTypeFormScreen() {
  const { id, editId } = useLocalSearchParams<{ id: string; editId?: string }>();
  const router = useRouter();
  const invalidate = useInvalidate();
  const isEdit = !!editId;

  return (
    <ResourceForm
      resource="stage-types"
      action={isEdit ? "edit" : "create"}
      id={editId}
      title={isEdit ? "Edit stage type" : "New stage type"}
      redirect={false}
      defaultValues={isEdit ? undefined : { projectId: id, isActive: true }}
      onSuccess={() => {
        invalidate({ resource: "stage-types", invalidates: ["list"] });
        if (router.canGoBack()) router.back();
      }}
    >
      {(control) => (
        <View className="gap-4">
          <TextField
            control={control}
            name="code"
            label="Code"
            placeholder="BOM"
            autoCapitalize="characters"
            rules={{ required: "Code is required" }}
          />
          <TextField
            control={control}
            name="name"
            label="Name"
            rules={{ required: "Name is required" }}
          />
          <RelationSelectField
            control={control}
            name="categoryId"
            label="Category"
            resource="stage-type-categories"
            filters={[{ field: "projectId", operator: "eq", value: id }]}
            getLabel={(c) => String(c.name)}
            rules={{ required: "Category is required" }}
          />
          <TextField control={control} name="defaultInput" label="Default input" />
          <TextField control={control} name="defaultOutput" label="Default output" />
          <SwitchField control={control} name="isActive" label="Active" />
        </View>
      )}
    </ResourceForm>
  );
}
