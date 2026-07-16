import { useState } from "react";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useLocalSearchParams } from "expo-router";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { TextField } from "@/components/refine-ui/form";
import { useToolAction } from "@/components/tool/tool-actions";
import { axiosInstance } from "@/providers/axios";

export default function ToolAssignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const run = useToolAction(id);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<BaseRecord, HttpError, FieldValues>();

  const onSubmit = handleSubmit(async (v) => {
    setSubmitting(true);
    await run(
      () =>
        axiosInstance.post(`/tools/${id}/assign`, {
          assignedTo: String(v.assignedTo).trim(),
          note: v.note || undefined,
        }),
      "Tool assigned",
    );
    setSubmitting(false);
  });

  return (
    <FormScreen
      title="Assign tool"
      submitLabel="Assign"
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <TextField
        control={control}
        name="assignedTo"
        label="Assigned to"
        placeholder="Person / station"
        rules={{ required: "Assignee is required" }}
      />
      <TextField control={control} name="note" label="Note" />
    </FormScreen>
  );
}
