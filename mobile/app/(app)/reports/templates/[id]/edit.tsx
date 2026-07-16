import type { BaseRecord, HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useLocalSearchParams } from "expo-router";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { ReportDefinitionFormFields } from "@/components/report/report-definition-form-fields";

export default function ReportTemplateEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading, query },
  } = useForm<BaseRecord, HttpError, FieldValues>({
    refineCoreProps: {
      resource: "report-definitions",
      action: "edit",
      id,
      redirect: "list",
    },
  });

  const record = query?.data?.data as { key?: string } | undefined;

  return (
    <FormScreen
      title="Edit template"
      submitting={formLoading}
      onSubmit={handleSubmit((values) => onFinish(values))}
    >
      <ReportDefinitionFormFields
        control={control}
        isEdit
        recordKey={record?.key}
      />
    </FormScreen>
  );
}
