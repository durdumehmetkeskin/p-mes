import type { Control, FieldValues } from "react-hook-form";
import { View } from "react-native";

import { TextAreaField, TextField } from "@/components/refine-ui/form";

/** projectId is prefilled from the workspace via defaultValues (not shown). */
export function OrderFormFields({ control }: { control: Control<FieldValues> }) {
  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="orderNumber"
        label="Order number"
        placeholder="PO-001"
        autoCapitalize="characters"
        rules={{ required: "Order number is required" }}
      />
      <TextField control={control} name="name" label="Name" />
      <TextField
        control={control}
        name="dueDate"
        label="Due date"
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      {/* Status is derived server-side (pending → in progress → completed). */}
      <TextAreaField control={control} name="description" label="Description" />
    </View>
  );
}
