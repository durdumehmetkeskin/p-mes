import { useState } from "react";
import { Text, View } from "react-native";
import type { AxiosError } from "axios";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useInvalidate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { toast } from "sonner-native";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { FieldRow, SectionLabel } from "@/components/refine-ui/field-row";
import {
  NumberField,
  RelationSelectField,
  TextField,
} from "@/components/refine-ui/form";
import { STOCK_INVALIDATE } from "@/components/stock/goods-move-form";
import { axiosInstance } from "@/providers/axios";
import { labelLot, labelMaterial, labelRack, labelWarehouse } from "@/lib/labels";

interface AdjustResult {
  systemQuantity: number;
  countedQuantity: number;
  delta: number;
  adjusted: boolean;
}

function errMsg(e: unknown): string {
  const m = (e as AxiosError<{ message?: string | string[] }>)?.response?.data
    ?.message;
  if (Array.isArray(m)) return m.join(", ");
  return m ?? "Count failed";
}

export default function StockCountScreen() {
  const invalidate = useInvalidate();
  const [submitting, setSubmitting] = useState(false);
  const [last, setLast] = useState<AdjustResult | null>(null);
  const { control, handleSubmit } = useForm<BaseRecord, HttpError, FieldValues>();

  const onSubmit = handleSubmit(async (v) => {
    setSubmitting(true);
    try {
      const { data } = await axiosInstance.post<AdjustResult>(
        "/inventory-transactions/adjust",
        {
          materialId: v.materialId,
          warehouseId: v.warehouseId,
          rackId: v.rackId || undefined,
          lotId: v.lotId || undefined,
          countedQuantity: v.countedQuantity,
          note: v.note || undefined,
        },
      );
      setLast(data);
      if (data.adjusted) {
        STOCK_INVALIDATE.forEach((r) =>
          invalidate({ resource: r, invalidates: ["list"] }),
        );
        toast.success(`Adjusted by ${data.delta}`);
      } else {
        toast.success("Count matches — no adjustment");
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormScreen
      title="Stock Count"
      submitLabel="Submit count"
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <View className="gap-4">
        {last ? (
          <View className="rounded-lg border border-border bg-card p-4">
            <SectionLabel>Last count</SectionLabel>
            <FieldRow label="System qty" value={last.systemQuantity} mono />
            <FieldRow label="Counted" value={last.countedQuantity} mono />
            <FieldRow label="Delta" value={last.delta} mono />
            <FieldRow label="Adjusted" value={last.adjusted ? "Yes" : "No"} />
          </View>
        ) : null}

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
          name="countedQuantity"
          label="Counted quantity"
          rules={{ required: "Counted quantity is required", min: { value: 0, message: "Must be ≥ 0" } }}
        />
        <TextField
          control={control}
          name="note"
          label="Note"
          placeholder="e.g. cycle count"
        />
      </View>
    </FormScreen>
  );
}
