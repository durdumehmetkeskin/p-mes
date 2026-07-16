import { View } from "react-native";
import { useInvalidate } from "@refinedev/core";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";
import { ResourceForm } from "@/components/refine-ui/resource-form";

export default function SectionFormScreen() {
  const { id, sectionId } = useLocalSearchParams<{
    id: string;
    sectionId?: string;
  }>();
  const router = useRouter();
  const invalidate = useInvalidate();
  const isEdit = !!sectionId;

  const onSuccess = () => {
    invalidate({ resource: "sections", invalidates: ["list"] });
    if (router.canGoBack()) router.back();
  };

  return (
    <ResourceForm
      resource="sections"
      action={isEdit ? "edit" : "create"}
      id={sectionId}
      title={isEdit ? "Edit section" : "New section"}
      redirect={false}
      onSuccess={onSuccess}
      defaultValues={isEdit ? undefined : { locationId: id, isActive: true }}
    >
      {(control) => (
        <View className="gap-4">
          <TextField
            control={control}
            name="code"
            label="Code"
            autoCapitalize="characters"
            rules={{ required: "Code is required" }}
          />
          <TextField
            control={control}
            name="name"
            label="Name"
            rules={{ required: "Name is required" }}
          />
          <TextAreaField
            control={control}
            name="description"
            label="Description"
          />
          <SwitchField control={control} name="isActive" label="Active" />
        </View>
      )}
    </ResourceForm>
  );
}
