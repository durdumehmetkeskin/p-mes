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
import { SectionLabel } from "@/components/refine-ui/field-row";
import {
  NumberField,
  RelationSelectField,
  TextField,
} from "@/components/refine-ui/form";
import { STOCK_INVALIDATE } from "@/components/stock/goods-move-form";
import { axiosInstance } from "@/providers/axios";
import { labelLot, labelMaterial, labelRack, labelWarehouse } from "@/lib/labels";

function errMsg(e: unknown): string {
  const m = (e as AxiosError<{ message?: string | string[] }>)?.response?.data
    ?.message;
  if (Array.isArray(m)) return m.join(", ");
  return m ?? "Transfer failed";
}

export default function GoodsTransferScreen() {
  const router = useRouter();
  const invalidate = useInvalidate();
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<BaseRecord, HttpError, FieldValues>();

  const onSubmit = handleSubmit(async (v) => {
    setSubmitting(true);
    try {
      await axiosInstance.post("/inventory-transactions/transfer", {
        materialId: v.materialId,
        quantity: v.quantity,
        note: v.note || undefined,
        sourceWarehouseId: v.sourceWarehouseId,
        sourceRackId: v.sourceRackId || undefined,
        sourceLotId: v.sourceLotId || undefined,
        targetWarehouseId: v.targetWarehouseId,
        targetRackId: v.targetRackId || undefined,
        targetLotId: v.targetLotId || undefined,
      });
      STOCK_INVALIDATE.forEach((r) =>
        invalidate({ resource: r, invalidates: ["list"] }),
      );
      toast.success("Transfer recorded");
      if (router.canGoBack()) router.back();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormScreen
      title="Stock Transfer"
      submitLabel="Transfer"
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
        <NumberField
          control={control}
          name="quantity"
          label="Quantity"
          rules={{ required: "Quantity is required", min: { value: 0.0001, message: "Must be > 0" } }}
        />

        <View className="gap-3 rounded-lg border border-border p-3">
          <SectionLabel>From</SectionLabel>
          <RelationSelectField
            control={control}
            name="sourceWarehouseId"
            label="Warehouse"
            resource="warehouses"
            getLabel={labelWarehouse}
            rules={{ required: "Source warehouse is required" }}
          />
          <RelationSelectField
            control={control}
            name="sourceRackId"
            label="Rack"
            resource="racks"
            getLabel={labelRack}
            allowClear
          />
          <RelationSelectField
            control={control}
            name="sourceLotId"
            label="Lot"
            resource="lots"
            getLabel={labelLot}
            allowClear
          />
        </View>

        <View className="gap-3 rounded-lg border border-border p-3">
          <SectionLabel>To</SectionLabel>
          <RelationSelectField
            control={control}
            name="targetWarehouseId"
            label="Warehouse"
            resource="warehouses"
            getLabel={labelWarehouse}
            rules={{ required: "Target warehouse is required" }}
          />
          <RelationSelectField
            control={control}
            name="targetRackId"
            label="Rack"
            resource="racks"
            getLabel={labelRack}
            allowClear
          />
          <RelationSelectField
            control={control}
            name="targetLotId"
            label="Lot"
            resource="lots"
            getLabel={labelLot}
            allowClear
          />
        </View>

        <TextField control={control} name="note" label="Note" />
      </View>
    </FormScreen>
  );
}
