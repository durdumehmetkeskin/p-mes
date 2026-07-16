import { useList } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useEffect, useState } from "react";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

export const UsersEdit = () => {
  const {
    refineCore: { onFinish, formLoading, query },
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ refineCoreProps: { resource: "users", action: "edit" } });

  // All assignable roles.
  const { result: rolesResult } = useList<RoleOption>({
    resource: "roles",
    pagination: { mode: "off" },
  });
  const roleOptions = rolesResult?.data ?? [];

  // Selected role names, seeded from the loaded user once available.
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const userRoles = query?.data?.data?.roles as string[] | undefined;

  useEffect(() => {
    if (userRoles) {
      setSelectedRoles(userRoles);
    }
  }, [userRoles]);

  const toggleRole = (name: string, checked: boolean) => {
    setSelectedRoles((prev) =>
      checked ? [...new Set([...prev, name])] : prev.filter((r) => r !== name),
    );
  };

  const submit = handleSubmit((values) => {
    const payload = { ...(values as Record<string, unknown>) };
    // Drop blank password so we don't fail backend validation.
    if (!payload.password) {
      delete payload.password;
    }
    payload.roles = selectedRoles;
    return onFinish(payload);
  });

  return (
    <RouteFormDialog title="Edit user">
      <form onSubmit={submit} className="space-y-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && (
                <span className="text-sm text-destructive">
                  {String(errors.email.message)}
                </span>
              )}
            </div>

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
              <Label htmlFor="password">New password</Label>
              <InputPassword
                id="password"
                placeholder="Leave blank to keep current"
                {...register("password", {
                  minLength: { value: 8, message: "At least 8 characters" },
                })}
              />
              {errors.password && (
                <span className="text-sm text-destructive">
                  {String(errors.password.message)}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-3">
                {roleOptions.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedRoles.includes(role.name)}
                      onCheckedChange={(checked) =>
                        toggleRole(role.name, checked === true)
                      }
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
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
