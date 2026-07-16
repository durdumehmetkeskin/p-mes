import type { Control, FieldValues } from "react-hook-form";
import { Text, View } from "react-native";

import {
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";
import { Label } from "@/components/ui/label";
import {
  DATASOURCE_OPTIONS,
  RECIPE_OPTIONS,
} from "@/components/report/report-constants";

export function ReportDefinitionFormFields({
  control,
  isEdit = false,
  recordKey,
}: {
  control: Control<FieldValues>;
  isEdit?: boolean;
  recordKey?: string;
}) {
  return (
    <View className="gap-4">
      {isEdit ? (
        <View className="gap-1.5">
          <Label>Key</Label>
          <View className="rounded-md border border-input bg-muted px-3 py-2.5">
            <Text className="font-mono text-base text-muted-foreground">
              {recordKey}
            </Text>
          </View>
        </View>
      ) : (
        <TextField
          control={control}
          name="key"
          label="Key"
          placeholder="production-summary"
          autoCapitalize="none"
          autoCorrect={false}
          rules={{
            required: "Key is required",
            pattern: {
              value: /^[a-z][a-z0-9_-]*$/,
              message: "Lowercase slug required",
            },
          }}
        />
      )}
      <TextField
        control={control}
        name="name"
        label="Name"
        rules={{ required: "Name is required" }}
      />
      <TextAreaField control={control} name="description" label="Description" />
      <SelectField
        control={control}
        name="dataSource"
        label="Data source"
        options={DATASOURCE_OPTIONS}
        rules={{ required: "Data source is required" }}
      />
      <SelectField
        control={control}
        name="recipe"
        label="Default format"
        options={RECIPE_OPTIONS}
      />
      <SwitchField control={control} name="isActive" label="Active" />
      <TextAreaField
        control={control}
        name="content"
        label="Template (Handlebars / HTML)"
        className="min-h-[220px] py-2.5 font-mono text-xs"
        rules={{ required: "Template content is required" }}
      />
      <TextAreaField
        control={control}
        name="helpers"
        label="Custom helpers (JS)"
        className="min-h-[120px] py-2.5 font-mono text-xs"
        hint="Optional. Built-ins: formatDate, formatDateTime, formatNumber, percent, eq, gt, or, defaultTo"
      />
    </View>
  );
}
