import { View } from "react-native";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useList } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useLocalSearchParams } from "expo-router";

import { FormScreen } from "@/components/refine-ui/form-screen";
import {
  CheckboxGroupField,
  TextField,
} from "@/components/refine-ui/form";

export default function UserEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading },
  } = useForm<BaseRecord, HttpError, FieldValues>({
    refineCoreProps: { resource: "users", action: "edit", id, redirect: "list" },
  });

  const { result } = useList<BaseRecord>({
    resource: "roles",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const roleOptions = (result?.data ?? []).map((r) => ({
    label: String(r.name),
    value: String(r.name),
  }));

  const submit = handleSubmit((values) => {
    const body = { ...values };
    if (!body.password) delete body.password; // keep current password
    return onFinish(body);
  });

  return (
    <FormScreen title="Edit user" submitting={formLoading} onSubmit={submit}>
      <View className="gap-4">
        <TextField
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          rules={{ required: "Email is required" }}
        />
        <TextField
          control={control}
          name="name"
          label="Name"
          rules={{ required: "Name is required" }}
        />
        <TextField
          control={control}
          name="password"
          label="Password"
          secureTextEntry
          placeholder="Leave blank to keep current"
          rules={{
            minLength: { value: 8, message: "At least 8 characters" },
          }}
        />
        <CheckboxGroupField
          control={control}
          name="roles"
          label="Roles"
          options={roleOptions}
        />
      </View>
    </FormScreen>
  );
}
