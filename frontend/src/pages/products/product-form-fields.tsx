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
import { LookupSelect } from "@/components/lookup-select";

// Sentinel for "none" (Radix Select disallows empty-string values).
const NONE = "__none__";

interface LocationOption {
  id: string;
  code: string;
  name: string;
}

interface StorageRackOption {
  id: string;
  code: string;
  note?: string | null;
  storage?: { id: string; locationId: string } | null;
}

type FormValues = Record<string, unknown>;

/**
 * Location → storage-rack cascade for where a produced product is shelved.
 * Every location owns one storage area (a location child object — NOT an
 * inventory warehouse) whose racks hold products; the form submits only
 * `storageRackId` (+ a UI-only `locationId` that callers must strip).
 */
export function LocationRackFields({ control }: { control: Control<FormValues> }) {
  const { result: locations } = useList<LocationOption>({
    resource: "locations",
    pagination: { mode: "off" },
  });
  const locationOptions = locations?.data ?? [];

  const { result: racks } = useList<StorageRackOption>({
    resource: "storage-racks",
    pagination: { mode: "off" },
  });
  const selectedLocationId = useWatch({ control, name: "locationId" });
  // Storage racks eager-load their storage (which carries locationId).
  const rackOptions = (racks?.data ?? []).filter(
    (r) => r.storage?.locationId === selectedLocationId,
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="locationId">Stored at location</Label>
        <Controller
          name="locationId"
          control={control}
          defaultValue={null}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : NONE}
              onValueChange={(v) => field.onChange(v === NONE ? null : v)}
            >
              <SelectTrigger id="locationId">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— None —</SelectItem>
                {locationOptions.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.code} · {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="storageRackId">Rack</Label>
        <Controller
          name="storageRackId"
          control={control}
          defaultValue={null}
          render={({ field }) => (
            <Select
              disabled={!selectedLocationId}
              value={field.value ? String(field.value) : NONE}
              onValueChange={(v) => field.onChange(v === NONE ? null : v)}
            >
              <SelectTrigger id="storageRackId">
                <SelectValue
                  placeholder={
                    selectedLocationId
                      ? "Select a rack"
                      : "Select a location first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— None —</SelectItem>
                {rackOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.code}
                    {r.note ? ` · ${r.note}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  );
}

interface Props {
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  /** create: product code is hidden (server-generated); edit: read-only. */
  mode: "create" | "edit";
}

/** Shared field set for the product create/edit forms. */
export function ProductFormFields({ register, control, errors, mode }: Props) {
  return (
    <>
      {mode === "edit" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Product code</Label>
          {/* Server-generated (PRD-YYYY-NNNN); read-only, ignored on save. */}
          <Input id="code" disabled {...register("code")} />
        </div>
      )}

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
        name="productTypeId"
        label="Product type"
        resource="product-types"
        dialogTitle="New product type"
        placeholder="Select a type"
        namePlaceholder="e.g. Mold"
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            step="0.001"
            min="0"
            {...register("quantity", {
              required: "Quantity is required",
              valueAsNumber: true,
              min: 0,
            })}
          />
          {errors.quantity && (
            <span className="text-sm text-destructive">
              {String(errors.quantity.message)}
            </span>
          )}
        </div>

        <LookupSelect
          control={control}
          name="materialUnitId"
          label="Unit"
          resource="material-units"
          dialogTitle="New unit"
          placeholder="Select unit"
          namePlaceholder="e.g. piece"
          minNameLength={1}
          unitNotation
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
      </div>

      {/* Where the product is stored: a rack in a location's storage area. */}
      <LocationRackFields control={control} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="producedAt">Produced at</Label>
        <Input id="producedAt" type="date" {...register("producedAt")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" {...register("note")} />
      </div>
    </>
  );
}
