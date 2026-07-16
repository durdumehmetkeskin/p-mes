import { useState } from "react";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useLocalSearchParams } from "expo-router";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { TextField } from "@/components/refine-ui/form";
import { useToolAction } from "@/components/tool/tool-actions";
import { axiosInstance } from "@/providers/axios";

export default function ToolUsageStartScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const run = useToolAction(id);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<BaseRecord, HttpError, FieldValues>();

  const onSubmit = handleSubmit(async (v) => {
    setSubmitting(true);
    await run(
      () =>
        axiosInstance.post(`/tools/${id}/usage/start`, {
          usedFor: v.usedFor || undefined,
          note: v.note || undefined,
        }),
      "Usage started",
    );
    setSubmitting(false);
  });

  return (
    <FormScreen
      title="Start usage"
      submitLabel="Start"
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <TextField
        control={control}
        name="usedFor"
        label="Used for"
        placeholder="e.g. WO-500"
      />
      <TextField control={control} name="note" label="Note" />
    </FormScreen>
  );
}
