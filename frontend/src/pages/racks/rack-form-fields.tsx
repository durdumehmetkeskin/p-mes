import { useList } from "@refinedev/core";
import { useEffect, useRef } from "react";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Controller, useController, useWatch } from "react-hook-form";

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

const NO_ORDER = "__none__";

interface ZoneOption {
  id: string;
  code: string;
  projectId?: string | null;
  warehouse?: { code?: string } | null;
}
interface OrderOption {
  id: string;
  orderNumber: string;
  name?: string | null;
}

type FormValues = Record<string, unknown>;

interface Props {
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
}

/** Shared field set for the rack create/edit forms. */
export function RackFormFields({ register, control, errors }: Props) {
  const { result } = useList<ZoneOption>({
    resource: "zones",
    pagination: { mode: "off" },
  });
  const zoneOptions = result?.data ?? [];

  // A rack may only be dedicated to an order of its zone's project.
  const zoneId = useWatch({ control, name: "zoneId" }) as string | undefined;
  const zoneProjectId =
    zoneOptions.find((z) => z.id === zoneId)?.projectId ?? null;

  const order = useController({
    control,
    name: "orderId",
    defaultValue: null,
  });

  const { result: ordersResult } = useList<OrderOption>({
    resource: "orders",
    pagination: { mode: "off" },
    filters: zoneProjectId
      ? [{ field: "projectId", operator: "eq", value: zoneProjectId }]
      : [],
    queryOptions: { enabled: Boolean(zoneProjectId) },
  });
  const orderOptions = ordersResult?.data ?? [];

  // Reset the order when the zone's project changes (only from a real project,
  // so an edit form's async load keeps its order).
  const prevProject = useRef(zoneProjectId);
  useEffect(() => {
    if (prevProject.current !== zoneProjectId) {
      const wasReal = prevProject.current != null;
      prevProject.current = zoneProjectId;
      if (wasReal) order.field.onChange(null);
    }
  }, [zoneProjectId, order.field]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="zoneId">Zone (warehouse / zone)</Label>
        <Controller
          name="zoneId"
          control={control}
          rules={{ required: "Zone is required" }}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : ""}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="zoneId">
                <SelectValue placeholder="Select a zone" />
              </SelectTrigger>
              <SelectContent>
                {zoneOptions.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.warehouse?.code ? `${z.warehouse.code} / ` : ""}
                    {z.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.zoneId && (
          <span className="text-sm text-destructive">
            {String(errors.zoneId.message)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            placeholder="R-01"
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
        <Label htmlFor="orderId">Dedicated to order (optional)</Label>
        <Select
          value={order.field.value ? String(order.field.value) : NO_ORDER}
          onValueChange={(v) =>
            order.field.onChange(v === NO_ORDER ? null : v)
          }
          disabled={!zoneProjectId}
        >
          <SelectTrigger id="orderId">
            <SelectValue
              placeholder={
                zoneProjectId
                  ? "Select an order"
                  : "Pick a zone assigned to a project first"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_ORDER}>— None —</SelectItem>
            {orderOptions.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.orderNumber}
                {o.name ? ` · ${o.name}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
