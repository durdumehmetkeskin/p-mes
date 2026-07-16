import { useForm } from "@refinedev/react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const UsersCreate = () => {
  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ refineCoreProps: { resource: "users", action: "create" } });

  return (
    <RouteFormDialog title="New user">
      <form onSubmit={handleSubmit(onFinish)} className="space-y-6">
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
              <Label htmlFor="password">Password</Label>
              <InputPassword
                id="password"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 8, message: "At least 8 characters" },
                })}
              />
              {errors.password && (
                <span className="text-sm text-destructive">
                  {String(errors.password.message)}
                </span>
              )}
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
