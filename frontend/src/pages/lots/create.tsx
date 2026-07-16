import { useForm } from "@refinedev/react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { Button } from "@/components/ui/button";
import { LotFormFields } from "./lot-form-fields";

type FormValues = Record<string, unknown>;

function clean(values: FormValues): FormValues {
  const payload = { ...values };
  if (typeof payload.quantity === "number" && Number.isNaN(payload.quantity)) {
    delete payload.quantity;
  }
  if (!payload.expiryDate) delete payload.expiryDate;
  delete payload.lotNumber; // server-generated
  return payload;
}

export const LotsCreate = () => {
  const {
    refineCore: { onFinish, formLoading },
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ refineCoreProps: { resource: "lots", action: "create" } });

  return (
    <RouteFormDialog title="New lot">
      <form
        onSubmit={handleSubmit((v) => onFinish(clean(v as FormValues)))}
        className="space-y-6"
      >
        <LotFormFields
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
