import { useCreate, useInvalidate, useList } from "@refinedev/core";
import { Plus } from "lucide-react";
import { useState } from "react";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { CustomerProjectSelect } from "@/components/customer-project-select";

// Sentinels for "none" (Radix Select disallows empty-string values).
const NO_TYPE = "__none__";
const NO_RACK = "__none__";

interface ToolTypeOption {
  id: string;
  name: string;
}

interface RackOption {
  id: string;
  code: string;
  zone?: { code?: string; warehouse?: { code?: string } | null } | null;
}

/**
 * Tool type picker with an inline "new type" creator, so a missing type can be
 * added without leaving the tool form (mirrors the material type picker).
 */
function ToolTypeSelect({ control }: { control: Control<FormValues> }) {
  const { result } = useList<ToolTypeOption>({
    resource: "tool-types",
    pagination: { mode: "off" },
  });
  const options = result?.data ?? [];

  const invalidate = useInvalidate();
  const { mutate: createType } = useCreate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="toolTypeId">Tool type</Label>
      <Controller
        name="toolTypeId"
        control={control}
        defaultValue={null}
        render={({ field }) => (
          <div className="flex gap-2">
            <Select
              value={field.value ? String(field.value) : NO_TYPE}
              onValueChange={(v) => field.onChange(v === NO_TYPE ? null : v)}
            >
              <SelectTrigger id="toolTypeId" className="flex-1">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TYPE}>— None —</SelectItem>
                {options.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="New tool type"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>New tool type</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="newToolTypeName">Name</Label>
                    <Input
                      id="newToolTypeName"
                      placeholder="e.g. End Mill"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="newToolTypeDesc">Description</Label>
                    <Textarea
                      id="newToolTypeDesc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      disabled={creating || name.trim().length < 2}
                      onClick={() => {
                        setCreating(true);
                        createType(
                          {
                            resource: "tool-types",
                            values: {
                              name: name.trim(),
                              description: description || undefined,
                            },
                          },
                          {
                            onSuccess: (res) => {
                              invalidate({
                                resource: "tool-types",
                                invalidates: ["list"],
                              });
                              // Select the freshly created type.
                              field.onChange((res.data as { id: string }).id);
                              setOpen(false);
                              setName("");
                              setDescription("");
                              setCreating(false);
                            },
                            onError: () => setCreating(false),
                          },
                        );
                      }}
                    >
                      {creating ? "Creating..." : "Create & select"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      />
    </div>
  );
}

// Mirrors the backend ToolCategory enum (value → label).
export const TOOL_CATEGORIES = [
  { value: "mold", label: "Mold (Kalıp)" },
  { value: "fixture", label: "Fixture (Fikstür)" },
  { value: "apparatus", label: "Apparatus (Aparat)" },
  { value: "cutting_tool", label: "Cutting Tool (Kesici Takım)" },
  {
    value: "measurement_equipment",
    label: "Measurement Equipment (Ölçüm Ekipmanı)",
  },
] as const;

// Mirrors the backend ToolStatus enum (value → label).
export const TOOL_STATUSES = [
  { value: "available", label: "Available" },
  { value: "in_use", label: "In use" },
  { value: "maintenance", label: "Maintenance" },
  { value: "calibration", label: "Calibration" },
  { value: "retired", label: "Retired" },
] as const;

export function toolCategoryLabel(value: string): string {
  return TOOL_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
export function toolStatusLabel(value: string): string {
  return TOOL_STATUSES.find((s) => s.value === value)?.label ?? value;
}

type FormValues = Record<string, unknown>;

interface Props {
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
}

/** Shared field set for the tool create/edit forms. */
export function ToolFormFields({ register, control, errors }: Props) {
  const { result: racks } = useList<RackOption>({
    resource: "racks",
    pagination: { mode: "off" },
  });
  const binOptions = racks?.data ?? [];

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            placeholder="TOOL-001"
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

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category</Label>
          <Controller
            name="category"
            control={control}
            rules={{ required: "Category is required" }}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {TOOL_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && (
            <span className="text-sm text-destructive">
              {String(errors.category.message)}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <Controller
            name="status"
            control={control}
            defaultValue="available"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : "available"}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOOL_STATUSES.map((s) => (
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

      <ToolTypeSelect control={control} />

      <CustomerProjectSelect control={control} />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input id="manufacturer" {...register("manufacturer")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="serialNumber">Serial number</Label>
          <Input id="serialNumber" {...register("serialNumber")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="rackId">Rack (warehouse / rack)</Label>
        <Controller
          name="rackId"
          control={control}
          defaultValue={null}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : NO_RACK}
              onValueChange={(v) =>
                field.onChange(v === NO_RACK ? null : v)
              }
            >
              <SelectTrigger id="rackId">
                <SelectValue placeholder="Select a rack" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_RACK}>— None —</SelectItem>
                {binOptions.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.zone ? `${[l.zone.warehouse?.code, l.zone.code].filter(Boolean).join(" / ")} / ` : ""}
                    {l.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            step="1"
            min="0"
            {...register("quantity", { valueAsNumber: true, min: 0 })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="purchaseDate">Purchase date</Label>
          <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nextMaintenanceDate">
            Next maintenance / calibration
          </Label>
          <Input
            id="nextMaintenanceDate"
            type="date"
            {...register("nextMaintenanceDate")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxLifeCycle">Rated life (max cycles)</Label>
          <Input
            id="maxLifeCycle"
            type="number"
            step="1"
            min="0"
            placeholder="e.g. 100000"
            {...register("maxLifeCycle", { valueAsNumber: true, min: 0 })}
          />
        </div>
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
