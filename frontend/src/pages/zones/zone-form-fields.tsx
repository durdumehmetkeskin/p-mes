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
import { Textarea } from "@/components/ui/textarea";

const NO_PROJECT = "__none__";

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}
interface ProjectOption {
  id: string;
  code?: string;
  name?: string;
}

type FormValues = Record<string, unknown>;

interface Props {
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
}

/** Shared field set for the zone create/edit forms. */
export function ZoneFormFields({ register, control, errors }: Props) {
  const { result } = useList<WarehouseOption>({
    resource: "warehouses",
    pagination: { mode: "off" },
  });
  const warehouseOptions = result?.data ?? [];
  const { result: projectsResult } = useList<ProjectOption>({
    resource: "projects",
    pagination: { mode: "off" },
  });
  const projectOptions = projectsResult?.data ?? [];

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="warehouseId">Warehouse</Label>
        <Controller
          name="warehouseId"
          control={control}
          rules={{ required: "Warehouse is required" }}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : ""}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="warehouseId">
                <SelectValue placeholder="Select a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouseOptions.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.code} · {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.warehouseId && (
          <span className="text-sm text-destructive">
            {String(errors.warehouseId.message)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            placeholder="Z-01"
            {...register("code", { required: "Code is required" })}
          />
          {errors.code && (
            <span className="text-sm text-destructive">
              {String(errors.code.message)}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="projectId">Project (optional)</Label>
        <Controller
          name="projectId"
          control={control}
          defaultValue={null}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : NO_PROJECT}
              onValueChange={(v) =>
                field.onChange(v === NO_PROJECT ? null : v)
              }
            >
              <SelectTrigger id="projectId">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>— None —</SelectItem>
                {projectOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {[p.code, p.name].filter(Boolean).join(" · ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
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
