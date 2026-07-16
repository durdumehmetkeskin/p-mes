import { useForm } from "@refinedev/react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { Button } from "@/components/ui/button";
import { useHydrateEditForm } from "@/hooks/use-hydrate-edit-form";
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

export const ProductsEdit = () => {
  const {
    refineCore: { onFinish, formLoading, query },
    register,
    control,
    reset,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm({ refineCoreProps: { resource: "products", action: "edit" } });

  // The date input needs YYYY-MM-DD; producedAt comes back as a full ISO stamp.
  // locationId is a UI-only cascade field derived from the storage rack's
  // storage (each location owns one storage area).
  const record = query?.data?.data as
    | (FormValues & {
        storageRack?: { storage?: { locationId?: string | null } | null } | null;
      })
    | undefined;
  const hydratable = record
    ? {
        ...record,
        producedAt:
          typeof record.producedAt === "string"
            ? record.producedAt.slice(0, 10)
            : record.producedAt,
        locationId: record.storageRack?.storage?.locationId ?? null,
      }
    : undefined;

  useHydrateEditForm(hydratable, reset, getValues);

  return (
    <RouteFormDialog title="Edit product">
      <form
        onSubmit={handleSubmit((v) => onFinish(clean(v as FormValues)))}
        className="space-y-6"
      >
        <ProductFormFields
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
