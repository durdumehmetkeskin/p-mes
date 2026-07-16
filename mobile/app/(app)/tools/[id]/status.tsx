import { useState } from "react";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useLocalSearchParams } from "expo-router";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { SelectField, TextField } from "@/components/refine-ui/form";
import { TOOL_STATUSES } from "@/components/tool/tool-constants";
import { useToolAction } from "@/components/tool/tool-actions";
import { axiosInstance } from "@/providers/axios";

export default function ToolStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const run = useToolAction(id);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<BaseRecord, HttpError, FieldValues>({
    defaultValues: { status: "available" },
  });

  const onSubmit = handleSubmit(async (v) => {
    setSubmitting(true);
    await run(
      () =>
        axiosInstance.patch(`/tools/${id}/status`, {
          status: v.status,
          note: v.note || undefined,
        }),
      "Status updated",
    );
    setSubmitting(false);
  });

  return (
    <FormScreen
      title="Change status"
      submitLabel="Update"
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <SelectField
        control={control}
        name="status"
        label="Status"
        options={[...TOOL_STATUSES]}
        rules={{ required: "Status is required" }}
      />
      <TextField control={control} name="note" label="Note" />
    </FormScreen>
  );
}
