import type { Control, FieldValues } from "react-hook-form";
import { View } from "react-native";

import {
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";

export function CustomerFormFields({
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
        placeholder="CUST-001"
        autoCapitalize="characters"
        rules={{ required: "Code is required" }}
      />
      <TextField
        control={control}
        name="name"
        label="Name"
        rules={{ required: "Name is required" }}
      />
      <TextField control={control} name="taxNumber" label="Tax number" />
      <TextField
        control={control}
        name="email"
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextField control={control} name="phone" label="Phone" />
      <TextAreaField control={control} name="address" label="Address" />
      <SwitchField control={control} name="isActive" label="Active" />
    </View>
  );
}
