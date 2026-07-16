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

const NONE = "__none__";

interface Opt {
  id: string;
}
interface MaterialOpt extends Opt {
  code: string;
  name: string;
}
interface WarehouseOpt extends Opt {
  code: string;
  name: string;
}
interface RackOpt extends Opt {
  code: string;
  zone: { code: string; warehouse?: { code?: string } | null } | null;
}
interface LotOpt extends Opt {
  lotNumber: string;
  material: { code: string } | null;
}

type FormValues = Record<string, unknown>;

interface Props {
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
}

/** Shared field set for the inventory balance create/edit forms. */
export function BalanceFormFields({ register, control, errors }: Props) {
  const { result: materials } = useList<MaterialOpt>({
    resource: "materials",
    pagination: { mode: "off" },
  });
  const { result: warehouses } = useList<WarehouseOpt>({
    resource: "warehouses",
    pagination: { mode: "off" },
  });
  const { result: racks } = useList<RackOpt>({
    resource: "racks",
    pagination: { mode: "off" },
  });
  const { result: lots } = useList<LotOpt>({
    resource: "lots",
    pagination: { mode: "off" },
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
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
                  {(materials?.data ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code} · {m.name}
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
                  {(warehouses?.data ?? []).map((w) => (
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="rackId">Rack (optional)</Label>
          <Controller
            name="rackId"
            control={control}
            defaultValue={null}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE}
                onValueChange={(v) => field.onChange(v === NONE ? null : v)}
              >
                <SelectTrigger id="rackId">
                  <SelectValue placeholder="Select a rack" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {(racks?.data ?? []).map((l) => (
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="lotId">Lot (optional)</Label>
          <Controller
            name="lotId"
            control={control}
            defaultValue={null}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE}
                onValueChange={(v) => field.onChange(v === NONE ? null : v)}
              >
                <SelectTrigger id="lotId">
                  <SelectValue placeholder="Select a lot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {(lots?.data ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.material ? `${l.material.code} / ` : ""}
                      {l.lotNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          step="0.001"
          {...register("quantity", { valueAsNumber: true, min: 0 })}
        />
      </div>
    </>
  );
}
