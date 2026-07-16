import { useForm } from "@refinedev/react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { Button } from "@/components/ui/button";
import { ToolFormFields } from "./tool-form-fields";

type FormValues = Record<string, unknown>;

function clean(values: FormValues): FormValues {
  const p = { ...values };
  if (typeof p.quantity === "number" && Number.isNaN(p.quantity))
    delete p.quantity;
  if (typeof p.maxLifeCycle === "number" && Number.isNaN(p.maxLifeCycle))
    delete p.maxLifeCycle;
  if (!p.purchaseDate) delete p.purchaseDate;
  if (!p.nextMaintenanceDate) delete p.nextMaintenanceDate;
  return p;
}

export const ToolsCreate = () => {
  const {
    refineCore: { onFinish, formLoading },
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ refineCoreProps: { resource: "tools", action: "create" } });

  return (
    <RouteFormDialog title="New tool">
      <form
        onSubmit={handleSubmit((v) => onFinish(clean(v as FormValues)))}
        className="space-y-6"
      >
        <ToolFormFields
          register={register as unknown as UseFormRegister<FormValues>}
          control={control as unknown as Control<FormValues>}
          errors={errors as FieldErrors<FormValues>}
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
