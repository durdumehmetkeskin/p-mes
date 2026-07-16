import { useForm } from "@refinedev/react-hook-form";
import { useLocalSearchParams } from "expo-router";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { MaterialFormFields } from "@/components/material/material-form-fields";

export default function MaterialEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading },
  } = useForm({
    refineCoreProps: {
      resource: "materials",
      action: "edit",
      id,
      redirect: "list",
    },
  });

  return (
    <FormScreen
      title="Edit material"
      submitting={formLoading}
      onSubmit={handleSubmit((values) => onFinish(values))}
    >
      <MaterialFormFields control={control} mode="edit" />
    </FormScreen>
  );
}
