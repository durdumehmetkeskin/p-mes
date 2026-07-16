import type { Control, FieldValues } from "react-hook-form";
import { View } from "react-native";

import {
  NumberField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";

export function OrderItemFormFields({
  control,
}: {
  control: Control<FieldValues>;
}) {
  return (
    <View className="gap-4">
      <NumberField
        control={control}
        name="sequence"
        label="Line #"
        rules={{ required: "Line number is required" }}
      />
      <TextField
        control={control}
        name="name"
        label="Name"
        rules={{ required: "Name is required" }}
      />
      <TextAreaField control={control} name="description" label="Description" />
    </View>
  );
}
