import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LookupSelect } from "@/components/lookup-select";

type FormValues = Record<string, unknown>;

interface Props {
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  /** create: product code is hidden (server-generated); edit: read-only. */
  mode: "create" | "edit";
}

/** Shared field set for the material create/edit forms. */
export function MaterialFormFields({ register, control, errors, mode }: Props) {
  return (
    <>
      <div className={mode === "edit" ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
        {mode === "edit" && (
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="code">Product code</Label>
            {/* Server-generated (MAT-YYYY-NNNN); read-only, ignored on save. */}
            <Input id="code" disabled {...register("code")} />
          </div>
        )}

        <LookupSelect
          control={control}
          name="materialUnitId"
          label="Unit"
          resource="material-units"
          dialogTitle="New material unit"
          placeholder="Select unit"
          namePlaceholder="e.g. roll"
          allowNone={false}
          required
          defaultName="piece"
          minNameLength={1}
          unitNotation
        />
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

      <LookupSelect
        control={control}
        name="materialTypeId"
        label="Material type"
        resource="material-types"
        dialogTitle="New material type"
        placeholder="Select a type"
        namePlaceholder="e.g. Packaging"
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dangerWeeks">Danger (weeks to SKT)</Label>
          <Input
            id="dangerWeeks"
            type="number"
            step="1"
            min="0"
            placeholder="e.g. 4"
            {...register("dangerWeeks", { valueAsNumber: true, min: 0 })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="warningWeeks">Warning (weeks to SKT)</Label>
          <Input
            id="warningWeeks"
            type="number"
            step="1"
            min="0"
            placeholder="e.g. 8"
            {...register("warningWeeks", { valueAsNumber: true, min: 0 })}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-8">
        <div className="flex items-center gap-3">
          <Controller
            name="isLotTracked"
            control={control}
            defaultValue={false}
            render={({ field }) => (
              <Switch
                id="isLotTracked"
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="isLotTracked">Lot tracked</Label>
        </div>

        <div className="flex items-center gap-3">
          <Controller
            name="isSerialTracked"
            control={control}
            defaultValue={false}
            render={({ field }) => (
              <Switch
                id="isSerialTracked"
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="isSerialTracked">Serial tracked</Label>
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
      </div>
    </>
  );
}
