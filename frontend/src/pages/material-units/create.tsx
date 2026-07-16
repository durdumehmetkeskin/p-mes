import { useForm } from "@refinedev/react-hook-form";
import { Controller } from "react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { UnitNameInput } from "@/components/unit-name-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const MaterialUnitsCreate = () => {
  const {
    refineCore: { onFinish, formLoading },
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    refineCoreProps: { resource: "material-units", action: "create" },
  });

  return (
    <RouteFormDialog title="New material unit">
      <form onSubmit={handleSubmit(onFinish)} className="space-y-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Controller
            name="name"
            control={control}
            rules={{ required: "Name is required" }}
            render={({ field }) => (
              <UnitNameInput
                id="name"
                placeholder="e.g. kg/m³"
                value={(field.value as string) ?? ""}
                onChange={field.onChange}
              />
            )}
          />
          {errors.name && (
            <span className="text-sm text-destructive">
              {String(errors.name.message)}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register("description")} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={formLoading}>
            {formLoading ? "Saving..." : "Create"}
          </Button>
        </div>
      </form>
    </RouteFormDialog>
  );
};
