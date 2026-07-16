import { View } from "react-native";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useLocalSearchParams } from "expo-router";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { TextAreaField, TextField } from "@/components/refine-ui/form";
import { RolePermissionsEditor } from "@/components/role/role-permissions-editor";

interface RoleRecord {
  name?: string;
  isSystem?: boolean;
  permissions?: string[];
}

export default function RoleEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading, query },
  } = useForm<BaseRecord, HttpError, FieldValues>({
    refineCoreProps: { resource: "roles", action: "edit", id, redirect: "list" },
  });

  const record = query?.data?.data as RoleRecord | undefined;
  const isSystem = !!record?.isSystem;

  return (
    <FormScreen
      title="Edit role"
      submitting={formLoading}
      onSubmit={handleSubmit((values) => onFinish(values))}
    >
      <View className="gap-4">
        <TextField
          control={control}
          name="name"
          label="Name"
          editable={!isSystem}
          autoCapitalize="none"
          autoCorrect={false}
          hint={isSystem ? "System role name can't be changed." : undefined}
          rules={{
            required: "Name is required",
            pattern: {
              value: /^[a-z][a-z0-9_-]*$/,
              message: "Lowercase slug required",
            },
          }}
        />
        <TextAreaField
          control={control}
          name="description"
          label="Description"
        />

        {record ? (
          <RolePermissionsEditor
            roleId={id as string}
            roleName={record.name ?? ""}
            initialPermissions={record.permissions ?? []}
          />
        ) : null}
      </View>
    </FormScreen>
  );
}
