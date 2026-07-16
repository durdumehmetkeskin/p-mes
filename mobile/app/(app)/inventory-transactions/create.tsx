import type { BaseRecord, HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { View } from "react-native";

import { FormScreen } from "@/components/refine-ui/form-screen";
import {
  NumberField,
  RelationSelectField,
  SelectField,
  TextField,
} from "@/components/refine-ui/form";
import { SectionLabel } from "@/components/refine-ui/field-row";
import { labelLot, labelRack, labelWarehouse } from "@/lib/labels";

const TYPE_OPTIONS = [
  { label: "In", value: "in" },
  { label: "Out", value: "out" },
  { label: "Transfer", value: "transfer" },
];

const SOURCE_KEYS = ["sourceWarehouseId", "sourceRackId", "sourceLotId"];
const TARGET_KEYS = ["targetWarehouseId", "targetRackId", "targetLotId"];

function clean(values: FieldValues): FieldValues {
  const out: FieldValues = { ...values };
  const drop = (keys: string[]) => keys.forEach((k) => delete out[k]);
  if (out.type === "in") drop(SOURCE_KEYS);
  if (out.type === "out") drop(TARGET_KEYS);
  // Drop empty slot fields.
  [...SOURCE_KEYS, ...TARGET_KEYS].forEach((k) => {
    if (out[k] == null || out[k] === "") delete out[k];
  });
  if (typeof out.quantity !== "number" || Number.isNaN(out.quantity)) {
    delete out.quantity;
  }
  return out;
}

export default function InventoryTransactionCreateScreen() {
  const {
    control,
    handleSubmit,
    watch,
    refineCore: { onFinish, formLoading },
  } = useForm<BaseRecord, HttpError, FieldValues>({
    refineCoreProps: {
      resource: "inventory-transactions",
      action: "create",
      redirect: "list",
    },
    defaultValues: { type: "in" },
  });

  const type = watch("type");
  const showSource = type === "out" || type === "transfer";
  const showTarget = type === "in" || type === "transfer";

  return (
    <FormScreen
      title="New movement"
      submitLabel="Record"
      submitting={formLoading}
      onSubmit={handleSubmit((values) => onFinish(clean(values)))}
    >
      <View className="gap-4">
        <SelectField
          control={control}
          name="type"
          label="Type"
          options={TYPE_OPTIONS}
        />
        <RelationSelectField
          control={control}
          name="materialId"
          label="Material"
          resource="materials"
          getLabel={(m) => [m.code, m.name].filter(Boolean).join(" · ")}
          rules={{ required: "Material is required" }}
        />
        <NumberField
          control={control}
          name="quantity"
          label="Quantity"
          rules={{ required: "Quantity is required" }}
        />

        {showSource ? (
          <View className="gap-3 rounded-lg border border-border p-3">
            <SectionLabel>Source</SectionLabel>
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
        ) : null}

        {showTarget ? (
          <View className="gap-3 rounded-lg border border-border p-3">
            <SectionLabel>Target</SectionLabel>
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
        ) : null}

        <TextField control={control} name="note" label="Note" />
      </View>
    </FormScreen>
  );
}
