import { useList } from "@refinedev/core";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface CustomerOption {
  id: string;
  code: string;
  name: string;
}

type FormValues = Record<string, unknown>;

interface Props {
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
}

export function ContactFormFields({ register, control, errors }: Props) {
  const { result } = useList<CustomerOption>({
    resource: "customers",
    pagination: { mode: "off" },
  });
  const customers = result?.data ?? [];

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="customerId">Customer</Label>
        <Controller
          name="customerId"
          control={control}
          rules={{ required: "Customer is required" }}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : ""}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="customerId">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.customerId && (
          <span className="text-sm text-destructive">
            {String(errors.customerId.message)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            {...register("firstName", { required: "First name is required" })}
          />
          {errors.firstName && (
            <span className="text-sm text-destructive">
              {String(errors.firstName.message)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            {...register("lastName", { required: "Last name is required" })}
          />
          {errors.lastName && (
            <span className="text-sm text-destructive">
              {String(errors.lastName.message)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">Role</Label>
          <Input id="role" {...register("role")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Controller
          name="isActive"
          control={control}
          defaultValue={true}
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
    </>
  );
}
