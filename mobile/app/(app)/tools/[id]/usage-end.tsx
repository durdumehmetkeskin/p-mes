import { useState } from "react";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useLocalSearchParams } from "expo-router";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { NumberField, TextField } from "@/components/refine-ui/form";
import { useToolAction } from "@/components/tool/tool-actions";
import { axiosInstance } from "@/providers/axios";

export default function ToolUsageEndScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const run = useToolAction(id);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<BaseRecord, HttpError, FieldValues>();

  const onSubmit = handleSubmit(async (v) => {
    setSubmitting(true);
    await run(
      () =>
        axiosInstance.post(`/tools/${id}/usage/end`, {
          quantity: typeof v.quantity === "number" ? v.quantity : undefined,
          note: v.note || undefined,
        }),
      "Usage ended",
    );
    setSubmitting(false);
  });

  return (
    <FormScreen
      title="End usage"
      submitLabel="End"
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <NumberField
        control={control}
        name="quantity"
        label="Quantity produced"
      />
      <TextField control={control} name="note" label="Note" />
    </FormScreen>
  );
}
