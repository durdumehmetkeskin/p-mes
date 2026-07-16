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
import { Textarea } from "@/components/ui/textarea";

interface ProjectOpt {
  id: string;
  code: string;
  name: string;
}

type FormValues = Record<string, unknown>;

interface Props {
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  /** True when the form lives inside a project workspace: the project is
   * fixed (comes from the form's defaultValues) and the picker is hidden. */
  lockProject?: boolean;
}

export function OrderFormFields({ register, control, errors, lockProject }: Props) {
  const { result: projects } = useList<ProjectOpt>({
    resource: "projects",
    pagination: { mode: "off" },
    queryOptions: { enabled: !lockProject },
  });

  return (
    <>
      {!lockProject && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="projectId">Project</Label>
          <Controller
            name="projectId"
            control={control}
            rules={{ required: "Project is required" }}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="projectId" className="w-full">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {(projects?.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} · {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.projectId && (
            <span className="text-sm text-destructive">
              {String(errors.projectId.message)}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="orderNumber">Order number</Label>
          <Input
            id="orderNumber"
            placeholder="PO-001"
            {...register("orderNumber", { required: "Order number is required" })}
          />
          {errors.orderNumber && (
            <span className="text-sm text-destructive">
              {String(errors.orderNumber.message)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} />
        </div>
      </div>

      {/* Status is derived server-side (pending → in progress → completed). */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="dueDate">Due date</Label>
        <Input id="dueDate" type="date" {...register("dueDate")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
      </div>
    </>
  );
}
