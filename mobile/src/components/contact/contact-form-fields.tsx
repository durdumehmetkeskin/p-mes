import type { BaseRecord } from "@refinedev/core";
import type { Control, FieldValues } from "react-hook-form";
import { View } from "react-native";

import {
  RelationSelectField,
  SwitchField,
  TextField,
} from "@/components/refine-ui/form";

const customerLabel = (c: BaseRecord) =>
  [c.code, c.name].filter(Boolean).join(" · ");

export function ContactFormFields({
  control,
}: {
  control: Control<FieldValues>;
}) {
  return (
    <View className="gap-4">
      <RelationSelectField
        control={control}
        name="customerId"
        label="Customer"
        resource="customers"
        getLabel={customerLabel}
        rules={{ required: "Customer is required" }}
      />
      <TextField
        control={control}
        name="firstName"
        label="First name"
        rules={{ required: "First name is required" }}
      />
      <TextField
        control={control}
        name="lastName"
        label="Last name"
        rules={{ required: "Last name is required" }}
      />
      <TextField control={control} name="role" label="Role" />
      <TextField
        control={control}
        name="email"
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextField control={control} name="phone" label="Phone" />
      <SwitchField control={control} name="isActive" label="Active" />
    </View>
  );
}
