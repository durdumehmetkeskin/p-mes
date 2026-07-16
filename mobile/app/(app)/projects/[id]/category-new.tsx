import { View } from "react-native";
import { useInvalidate } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import { NumberField, TextField } from "@/components/refine-ui/form";
import { ResourceForm } from "@/components/refine-ui/resource-form";

export default function CategoryFormScreen() {
  const { id, editId } = useLocalSearchParams<{ id: string; editId?: string }>();
  const router = useRouter();
  const invalidate = useInvalidate();
  const isEdit = !!editId;

  return (
    <ResourceForm
      resource="stage-type-categories"
      action={isEdit ? "edit" : "create"}
      id={editId}
      title={isEdit ? "Edit category" : "New category"}
      redirect={false}
      defaultValues={isEdit ? undefined : { projectId: id }}
      onSuccess={() => {
        invalidate({ resource: "stage-type-categories", invalidates: ["list"] });
        if (router.canGoBack()) router.back();
      }}
    >
      {(control) => (
        <View className="gap-4">
          <TextField
            control={control}
            name="code"
            label="Code"
            placeholder="quality"
            autoCapitalize="none"
            rules={{ required: "Code is required" }}
          />
          <TextField
            control={control}
            name="name"
            label="Name"
            rules={{ required: "Name is required" }}
          />
          <TextField
            control={control}
            name="color"
            label="Color"
            placeholder="#22c55e"
            autoCapitalize="none"
          />
          <NumberField control={control} name="sortOrder" label="Sort order" />
        </View>
      )}
    </ResourceForm>
  );
}
