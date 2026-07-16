import { useState } from "react";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useLocalSearchParams } from "expo-router";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { NumberField, TextField } from "@/components/refine-ui/form";
import { useToolAction } from "@/components/tool/tool-actions";
import { axiosInstance } from "@/providers/axios";

export default function ToolCyclesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const run = useToolAction(id);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<BaseRecord, HttpError, FieldValues>();

  const onSubmit = handleSubmit(async (v) => {
    setSubmitting(true);
    await run(
      () =>
        axiosInstance.post(`/tools/${id}/cycles`, {
          cycles: Math.round(Number(v.cycles)),
          note: v.note || undefined,
        }),
      "Cycles added",
    );
    setSubmitting(false);
  });

  return (
    <FormScreen
      title="Add cycles"
      submitLabel="Add"
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <NumberField
        control={control}
        name="cycles"
        label="Cycles"
        rules={{ required: "Cycles is required", min: { value: 1, message: "Must be ≥ 1" } }}
      />
      <TextField control={control} name="note" label="Note" />
    </FormScreen>
  );
}
