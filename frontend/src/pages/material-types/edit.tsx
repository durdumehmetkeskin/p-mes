import { useForm } from "@refinedev/react-hook-form";
import { Controller } from "react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { useHydrateEditForm } from "@/hooks/use-hydrate-edit-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const MaterialTypesEdit = () => {
  const {
    refineCore: { onFinish, formLoading, query },
    register,
    control,
    reset,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm({
    refineCoreProps: { resource: "material-types", action: "edit" },
  });

  useHydrateEditForm(
    query?.data?.data as Record<string, unknown> | undefined,
    reset,
    getValues,
  );

  return (
    <RouteFormDialog title="Edit material type">
      <form onSubmit={handleSubmit(onFinish)} className="space-y-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register("name", { required: "Name is required" })}
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

        <div className="flex items-center gap-3">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Switch
                id="isActive"
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={formLoading}>
            {formLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </RouteFormDialog>
  );
};
