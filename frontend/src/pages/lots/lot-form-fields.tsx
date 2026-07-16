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
import { CustomerProjectSelect } from "@/components/customer-project-select";

const NO_RACK = "__none__";

interface MaterialOption {
  id: string;
  sku: string;
  name: string;
}
interface RackOption {
  id: string;
  code: string;
  zone: { code: string; warehouse?: { code?: string } | null } | null;
}

type FormValues = Record<string, unknown>;

interface Props {
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
}

/** Shared field set for the lot create/edit forms. */
export function LotFormFields({ register, control, errors }: Props) {
  const { result: materialsResult } = useList<MaterialOption>({
    resource: "materials",
    pagination: { mode: "off" },
  });
  const { result: binsResult } = useList<RackOption>({
    resource: "racks",
    pagination: { mode: "off" },
  });
  const materials = materialsResult?.data ?? [];
  const racks = binsResult?.data ?? [];

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="materialId">Material</Label>
        <Controller
          name="materialId"
          control={control}
          rules={{ required: "Material is required" }}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : ""}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="materialId">
                <SelectValue placeholder="Select a material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.sku} · {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.materialId && (
          <span className="text-sm text-destructive">
            {String(errors.materialId.message)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="expiryDate">Expiry date (SKT)</Label>
        <Input id="expiryDate" type="date" {...register("expiryDate")} />
        <span className="text-xs text-muted-foreground">
          Lot number is generated automatically (LOT-YYYYMMDD-NNNN).
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="rackId">Rack</Label>
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
                {racks.map((l) => (
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

      <CustomerProjectSelect control={control} />
    </>
  );
}
