import { useList } from "@refinedev/core";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NONE = "__none__";

/** Fixed project statuses (mirrors the backend ProjectStatus enum). */
export const PROJECT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "passive", label: "Passive" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
] as const;

interface Opt {
  id: string;
}
interface UserOpt extends Opt {
  name: string;
  email: string;
}
interface CompanyOpt extends Opt {
  code: string;
  name: string;
}
interface ContactOpt extends Opt {
  firstName: string;
  lastName: string;
  customerId: string;
}

type FormValues = Record<string, unknown>;

interface Props {
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  /** create: code is hidden (server-generated); edit: shown read-only. */
  mode: "create" | "edit";
}

export function ProjectFormFields({ register, control, errors, mode }: Props) {
  const { result: users } = useList<UserOpt>({
    resource: "users",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
  });
  const { result: companies } = useList<CompanyOpt>({
    resource: "customers",
    pagination: { mode: "off" },
  });
  const { result: contacts } = useList<ContactOpt>({
    resource: "contacts",
    pagination: { mode: "off" },
  });

  const selectedCompany = useWatch({ control, name: "customerCompanyId" }) as
    | string
    | null
    | undefined;
  const contactOptions = (contacts?.data ?? []).filter(
    (c) => !selectedCompany || c.customerId === selectedCompany,
  );

  return (
    <>
      <div className={mode === "edit" ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "grid grid-cols-1 gap-4"}>
        {mode === "edit" && (
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="code">Code</Label>
            {/* Server-generated (PRJ-YYYY-NNNN); read-only, ignored on save. */}
            <Input id="code" disabled {...register("code")} />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-2">
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="managerUserId">Manager</Label>
          <Controller
            name="managerUserId"
            control={control}
            defaultValue={null}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE}
                onValueChange={(v) => field.onChange(v === NONE ? null : v)}
              >
                <SelectTrigger id="managerUserId" className="w-full">
                  <SelectValue placeholder="Manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {(users?.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="customerCompanyId">Customer</Label>
          <Controller
            name="customerCompanyId"
            control={control}
            defaultValue={null}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE}
                onValueChange={(v) => field.onChange(v === NONE ? null : v)}
              >
                <SelectTrigger id="customerCompanyId" className="w-full">
                  <SelectValue placeholder="Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {(companies?.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} · {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="contactPersonId">Contact</Label>
          <Controller
            name="contactPersonId"
            control={control}
            defaultValue={null}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE}
                onValueChange={(v) => field.onChange(v === NONE ? null : v)}
              >
                <SelectTrigger id="contactPersonId" className="w-full">
                  <SelectValue placeholder="Contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {contactOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" type="date" {...register("endDate")} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <Controller
            name="status"
            control={control}
            defaultValue="active"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : "active"}
                onValueChange={(v) => field.onChange(v)}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
      </div>
    </>
  );
}
