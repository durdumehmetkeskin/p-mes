import { useForm } from "@refinedev/react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { Button } from "@/components/ui/button";
import { ProjectFormFields } from "./project-form-fields";

type FormValues = Record<string, unknown>;

function clean(values: FormValues): FormValues {
  const p = { ...values };
  if (!p.startDate) delete p.startDate;
  if (!p.endDate) delete p.endDate;
  return p;
}

export const ProjectsCreate = () => {
  const {
    refineCore: { onFinish, formLoading },
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ refineCoreProps: { resource: "projects", action: "create" } });

  return (
    <RouteFormDialog title="New project">
      <form
        onSubmit={handleSubmit((v) => onFinish(clean(v as FormValues)))}
        className="space-y-6"
      >
        <ProjectFormFields
          register={register as unknown as UseFormRegister<FormValues>}
          control={control as unknown as Control<FormValues>}
          errors={errors as FieldErrors<FormValues>}
          mode="create"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={formLoading}>
            {formLoading ? "Saving..." : "Create"}
          </Button>
        </div>
      </form>
    </RouteFormDialog>
  );
};
