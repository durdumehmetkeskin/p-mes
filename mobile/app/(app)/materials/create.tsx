import type { BaseRecord, HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { MaterialFormFields } from "@/components/material/material-form-fields";

export default function MaterialCreateScreen() {
  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading },
  } = useForm<BaseRecord, HttpError, FieldValues>({
    refineCoreProps: { resource: "materials", action: "create", redirect: "list" },
    defaultValues: {
      isActive: true,
      isLotTracked: false,
      isSerialTracked: false,
    },
  });

  return (
    <FormScreen
      title="New material"
      submitting={formLoading}
      submitLabel="Create"
      onSubmit={handleSubmit((values) => onFinish(values))}
    >
      <MaterialFormFields control={control} mode="create" />
    </FormScreen>
  );
}
