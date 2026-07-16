import { useList } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { Control } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";

import { RouteFormDialog } from "@/components/refine-ui/views/route-form-dialog";
import { Button } from "@/components/ui/button";
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
const TYPES = ["in", "out", "transfer"] as const;

type FormValues = Record<string, unknown>;
interface Opt {
  id: string;
  label: string;
}

function SlotFields({
  prefix,
  title,
  control,
  warehouses,
  racks,
  lots,
}: {
  prefix: "source" | "target";
  title: string;
  control: Control<FormValues>;
  warehouses: Opt[];
  racks: Opt[];
  lots: Opt[];
}) {
  return (
    <fieldset className="rounded-md border p-4 space-y-4">
      <legend className="px-1 text-sm font-medium">{title}</legend>

      <div className="flex flex-col gap-2">
        <Label>Warehouse</Label>
        <Controller
          name={`${prefix}WarehouseId`}
          control={control}
          rules={{ required: "Warehouse is required" }}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : ""}
              onValueChange={field.onChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(["Rack", "Lot"] as const).map((kind) => {
          const name = `${prefix}${kind}Id`;
          const opts = kind === "Rack" ? racks : lots;
          return (
            <div key={name} className="flex flex-col gap-2">
              <Label>{kind} (optional)</Label>
              <Controller
                name={name}
                control={control}
                defaultValue={null}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : NONE}
                    onValueChange={(v) =>
                      field.onChange(v === NONE ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select a ${kind.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— None —</SelectItem>
                      {opts.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

// Strip the slot the chosen type must not carry, and blank numerics.
function clean(values: FormValues): FormValues {
  const p = { ...values };
  if (typeof p.quantity === "number" && Number.isNaN(p.quantity)) {
    delete p.quantity;
  }
  const type = p.type;
  const dropSource = type === "in";
  const dropTarget = type === "out";
  for (const k of ["sourceWarehouseId", "sourceRackId", "sourceLotId"]) {
    if (dropSource || !p[k]) delete p[k];
  }
  for (const k of ["targetWarehouseId", "targetRackId", "targetLotId"]) {
    if (dropTarget || !p[k]) delete p[k];
  }
  return p;
}

export const InventoryTransactionsCreate = () => {
  const {
    refineCore: { onFinish, formLoading },
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    refineCoreProps: { resource: "inventory-transactions", action: "create" },
  });

  const type = useWatch({ control, name: "type", defaultValue: "in" }) as
    | string
    | undefined;
  const showSource = type === "out" || type === "transfer";
  const showTarget = type === "in" || type === "transfer";

  const ctrl = control as unknown as Control<FormValues>;

  const { result: materials } = useList({
    resource: "materials",
    pagination: { mode: "off" },
  });
  const { result: warehouses } = useList({
    resource: "warehouses",
    pagination: { mode: "off" },
  });
  const { result: racks } = useList({
    resource: "racks",
    pagination: { mode: "off" },
  });
  const { result: lots } = useList({
    resource: "lots",
    pagination: { mode: "off" },
  });

  const materialOpts: Opt[] = (materials?.data ?? []).map((m: any) => ({
    id: m.id,
    label: `${m.code} · ${m.name}`,
  }));
  const warehouseOpts: Opt[] = (warehouses?.data ?? []).map((w: any) => ({
    id: w.id,
    label: `${w.code} · ${w.name}`,
  }));
  const binOpts: Opt[] = (racks?.data ?? []).map((l: any) => ({
    id: l.id,
    label: `${l.zone ? [l.zone.warehouse?.code, l.zone.code].filter(Boolean).join(" / ") + " / " : ""}${l.code}`,
  }));
  const lotOpts: Opt[] = (lots?.data ?? []).map((l: any) => ({
    id: l.id,
    label: `${l.material ? l.material.code + " / " : ""}${l.lotNumber}`,
  }));

  return (
    <RouteFormDialog title="Record stock movement">
      <form
        onSubmit={handleSubmit((v) => onFinish(clean(v as FormValues)))}
        className="space-y-6"
      >
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Type</Label>
                <Controller
                  name="type"
                  control={ctrl}
                  defaultValue="in"
                  render={({ field }) => (
                    <Select value={String(field.value)} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  {...register("quantity", {
                    valueAsNumber: true,
                    required: "Quantity is required",
                    min: { value: 0.001, message: "Must be positive" },
                  })}
                />
                {errors.quantity && (
                  <span className="text-sm text-destructive">
                    {String(errors.quantity.message)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Material</Label>
              <Controller
                name="materialId"
                control={ctrl}
                rules={{ required: "Material is required" }}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialOpts.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
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

            {showSource && (
              <SlotFields
                prefix="source"
                title="From (source)"
                control={ctrl}
                warehouses={warehouseOpts}
                racks={binOpts}
                lots={lotOpts}
              />
            )}
            {showTarget && (
              <SlotFields
                prefix="target"
                title="To (target)"
                control={ctrl}
                warehouses={warehouseOpts}
                racks={binOpts}
                lots={lotOpts}
              />
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" {...register("note")} />
            </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={formLoading}>
            {formLoading ? "Saving..." : "Record movement"}
          </Button>
        </div>
      </form>
    </RouteFormDialog>
  );
};
