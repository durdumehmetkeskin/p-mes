import { useForm } from "@refinedev/react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { Button } from "@/components/ui/button";
import { useHydrateEditForm } from "@/hooks/use-hydrate-edit-form";
import { MaterialFormFields } from "./material-form-fields";

type FormValues = Record<string, unknown>;

function clean(values: FormValues): FormValues {
  const payload = { ...values };
  for (const key of ["dangerWeeks", "warningWeeks"]) {
    if (typeof payload[key] === "number" && Number.isNaN(payload[key])) {
      delete payload[key];
    }
  }
  return payload;
}

export const MaterialsEdit = () => {
  const {
    refineCore: { onFinish, formLoading, query },
    register,
    control,
    reset,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm({ refineCoreProps: { resource: "materials", action: "edit" } });

  useHydrateEditForm(
    query?.data?.data as FormValues | undefined,
    reset,
    getValues,
  );

  return (
    <RouteFormDialog title="Edit material">
      <form
        onSubmit={handleSubmit((v) => onFinish(clean(v as FormValues)))}
        className="space-y-6"
      >
        <MaterialFormFields
          register={register as unknown as UseFormRegister<FormValues>}
          control={control as unknown as Control<FormValues>}
          errors={errors as FieldErrors<FormValues>}
          mode="edit"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={formLoading}>
            {formLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </RouteFormDialog>
  );
};
