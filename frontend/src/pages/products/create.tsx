import { useForm } from "@refinedev/react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { Button } from "@/components/ui/button";
import { ProductFormFields } from "./product-form-fields";

type FormValues = Record<string, unknown>;

function clean(values: FormValues): FormValues {
  const payload = { ...values };
  if (typeof payload.quantity === "number" && Number.isNaN(payload.quantity)) {
    delete payload.quantity;
  }
  // An empty date input submits "" which fails @IsDateString.
  if (!payload.producedAt) delete payload.producedAt;
  // UI-only cascade field — the storage rack already pins the location.
  delete payload.locationId;
  if (!payload.storageRackId) payload.storageRackId = null;
  return payload;
}

export const ProductsCreate = () => {
  const {
    refineCore: { onFinish, formLoading },
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ refineCoreProps: { resource: "products", action: "create" } });

  return (
    <RouteFormDialog title="New product">
      <form
        onSubmit={handleSubmit((v) => onFinish(clean(v as FormValues)))}
        className="space-y-6"
      >
        <ProductFormFields
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
