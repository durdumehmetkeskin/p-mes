import type { Control, FieldValues } from "react-hook-form";
import { View } from "react-native";

import {
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";

export function LocationFormFields({
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
        placeholder="LOC-001"
        autoCapitalize="characters"
        rules={{ required: "Code is required" }}
      />
      <TextField
        control={control}
        name="name"
        label="Name"
        rules={{ required: "Name is required" }}
      />
      <TextAreaField control={control} name="description" label="Description" />
      <SwitchField control={control} name="isActive" label="Active" />
    </View>
  );
}
