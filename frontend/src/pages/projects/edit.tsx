import { useForm } from "@refinedev/react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { Button } from "@/components/ui/button";
import { useHydrateEditForm } from "@/hooks/use-hydrate-edit-form";
import { ProjectFormFields } from "./project-form-fields";

type FormValues = Record<string, unknown>;

function clean(values: FormValues): FormValues {
  const p = { ...values };
  if (!p.startDate) delete p.startDate;
  if (!p.endDate) delete p.endDate;
  delete p.code; // server-generated, immutable
  return p;
}

export const ProjectsEdit = () => {
  const {
    refineCore: { onFinish, formLoading, query },
    register,
    control,
    reset,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm({ refineCoreProps: { resource: "projects", action: "edit" } });

  useHydrateEditForm(
    query?.data?.data as FormValues | undefined,
    reset,
    getValues,
  );

  return (
    <RouteFormDialog title="Edit project">
      <form
        onSubmit={handleSubmit((v) => onFinish(clean(v as FormValues)))}
        className="space-y-6"
      >
        <ProjectFormFields
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
