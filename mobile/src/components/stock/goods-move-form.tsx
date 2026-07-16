import { useState } from "react";
import { View } from "react-native";
import type { AxiosError } from "axios";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useInvalidate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { FormScreen } from "@/components/refine-ui/form-screen";
import {
  NumberField,
  RelationSelectField,
  TextField,
} from "@/components/refine-ui/form";
import { axiosInstance } from "@/providers/axios";
import { labelLot, labelMaterial, labelRack, labelWarehouse } from "@/lib/labels";

export const STOCK_INVALIDATE = [
  "materials",
  "inventory-balances",
  "inventory-transactions",
  "lots",
];

function errMsg(e: unknown): string {
  const m = (e as AxiosError<{ message?: string | string[] }>)?.response?.data
    ?.message;
  if (Array.isArray(m)) return m.join(", ");
  return m ?? "Operation failed";
}

/** Shared Receive / Issue form (identical shapes; different endpoint). */
export function GoodsMoveForm({
  endpoint,
  title,
  submitLabel,
  notePlaceholder,
}: {
  endpoint: "receive" | "issue";
  title: string;
  submitLabel: string;
  notePlaceholder?: string;
}) {
  const router = useRouter();
  const invalidate = useInvalidate();
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<BaseRecord, HttpError, FieldValues>();

  const onSubmit = handleSubmit(async (v) => {
    setSubmitting(true);
    try {
      await axiosInstance.post(`/inventory-transactions/${endpoint}`, {
        materialId: v.materialId,
        warehouseId: v.warehouseId,
        rackId: v.rackId || undefined,
        lotId: v.lotId || undefined,
        quantity: v.quantity,
        note: v.note || undefined,
      });
      STOCK_INVALIDATE.forEach((r) =>
        invalidate({ resource: r, invalidates: ["list"] }),
      );
      toast.success(`${title} recorded`);
      if (router.canGoBack()) router.back();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormScreen
      title={title}
      submitLabel={submitLabel}
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <View className="gap-4">
        <RelationSelectField
          control={control}
          name="materialId"
          label="Material"
          resource="materials"
          getLabel={labelMaterial}
          rules={{ required: "Material is required" }}
        />
        <RelationSelectField
          control={control}
          name="warehouseId"
          label="Warehouse"
          resource="warehouses"
          getLabel={labelWarehouse}
          rules={{ required: "Warehouse is required" }}
        />
        <RelationSelectField
          control={control}
          name="rackId"
          label="Rack"
          resource="racks"
          getLabel={labelRack}
          allowClear
        />
        <RelationSelectField
          control={control}
          name="lotId"
          label="Lot"
          resource="lots"
          getLabel={labelLot}
          allowClear
        />
        <NumberField
          control={control}
          name="quantity"
          label="Quantity"
          rules={{ required: "Quantity is required", min: { value: 0.0001, message: "Must be > 0" } }}
        />
        <TextField
          control={control}
          name="note"
          label="Note"
          placeholder={notePlaceholder}
        />
      </View>
    </FormScreen>
  );
}
