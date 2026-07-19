import { useState } from "react";
import { View } from "react-native";
import { type BaseRecord, type HttpError, useCreate, useInvalidate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useLocalSearchParams, useRouter } from "expo-router";

import { FormScreen } from "@/components/refine-ui/form-screen";
import {
  NumberField,
  RelationSelectField,
  SelectField,
  SwitchField,
  TextField,
} from "@/components/refine-ui/form";

const MODE_OPTIONS = [
  { label: "From template", value: "template" },
  { label: "From scratch", value: "scratch" },
];

export default function ProcessCreateScreen() {
  const { id, orderItemId } = useLocalSearchParams<{
    id: string;
    orderItemId: string;
  }>();
  const router = useRouter();
  const invalidate = useInvalidate();
  const { mutate: createProcess } = useCreate();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, watch } = useForm<BaseRecord, HttpError, FieldValues>({
    defaultValues: { mode: "template", requireEstimates: false },
  });
  const mode = watch("mode");
  const requireEstimates = watch("requireEstimates");

  const onSubmit = handleSubmit((v) => {
    const body: Record<string, unknown> = { orderItemId };
    if (v.mode === "template") body.templateId = v.templateId;
    if (v.requireEstimates) {
      body.requireEstimates = true;
      body.estimatedStartDate = v.estimatedStartDate || undefined;
      body.estimatedCompletedDate = v.estimatedCompletedDate || undefined;
      body.estimatedDurationHours =
        typeof v.estimatedDurationHours === "number"
          ? v.estimatedDurationHours
          : undefined;
    }
    setSubmitting(true);
    createProcess(
      { resource: "processes", values: body },
      {
        onSuccess: () => {
          invalidate({ resource: "processes", invalidates: ["list"] });
          setSubmitting(false);
          if (router.canGoBack()) router.back();
        },
        onError: () => setSubmitting(false),
      },
    );
  });

  return (
    <FormScreen
      title="New process"
      submitLabel="Create"
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <View className="gap-4">
        <SelectField
          control={control}
          name="mode"
          label="Source"
          options={MODE_OPTIONS}
        />
        {mode === "template" ? (
          <RelationSelectField
            control={control}
            name="templateId"
            label="Template"
            resource="workflow-templates"
            filters={[{ field: "projectId", operator: "eq", value: id }]}
            getLabel={(t) => String(t.name)}
            rules={{ required: "Template is required" }}
          />
        ) : null}

        <SwitchField
          control={control}
          name="requireEstimates"
          label="Require estimates"
        />
        {requireEstimates ? (
          <View className="gap-4 rounded-lg border border-border p-3">
            <TextField
              control={control}
              name="estimatedStartDate"
              label="Est. start"
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
            <TextField
              control={control}
              name="estimatedCompletedDate"
              label="Est. completion"
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
            <NumberField
              control={control}
              name="estimatedDurationHours"
              label="Est. duration (h)"
            />
          </View>
        ) : null}
      </View>
    </FormScreen>
  );
}
