import { useState } from "react";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useLocalSearchParams } from "expo-router";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { TextField } from "@/components/refine-ui/form";
import { useToolAction } from "@/components/tool/tool-actions";
import { axiosInstance } from "@/providers/axios";

export default function ToolReturnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const run = useToolAction(id);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<BaseRecord, HttpError, FieldValues>();

  const onSubmit = handleSubmit(async (v) => {
    setSubmitting(true);
    await run(
      () =>
        axiosInstance.post(`/tools/${id}/return`, {
          note: v.note || undefined,
        }),
      "Tool returned",
    );
    setSubmitting(false);
  });

  return (
    <FormScreen
      title="Return tool"
      submitLabel="Return"
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <TextField control={control} name="note" label="Return note" />
    </FormScreen>
  );
}
