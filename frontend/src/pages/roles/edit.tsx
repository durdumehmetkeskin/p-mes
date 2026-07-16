import { useForm } from "@refinedev/react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RolePermissionsEditor } from "./role-permissions-editor";

interface RoleRecord {
  id: string;
  name: string;
  isSystem: boolean;
  permissions?: string[];
}

export const RolesEdit = () => {
  const {
    refineCore: { onFinish, formLoading, query },
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ refineCoreProps: { resource: "roles", action: "edit" } });

  const record = query?.data?.data as RoleRecord | undefined;
  // System roles cannot be renamed (the API rejects it); lock the name field.
  const isSystem = Boolean(record?.isSystem);

  return (
    <RouteFormDialog title="Edit role">
      <form onSubmit={handleSubmit(onFinish)} className="space-y-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            disabled={isSystem}
            {...register("name", {
              required: "Name is required",
              pattern: {
                value: /^[a-z][a-z0-9_-]*$/,
                message: "Lowercase slug (letters, digits, - and _)",
              },
            })}
          />
          {isSystem && (
            <span className="text-sm text-muted-foreground">
              System roles cannot be renamed.
            </span>
          )}
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
            {formLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>

      {record?.id && (
        <div className="mt-6 border-t pt-6">
          <RolePermissionsEditor
            roleId={record.id}
            roleName={record.name}
            initialPermissions={record.permissions ?? []}
          />
        </div>
      )}
    </RouteFormDialog>
  );
};
