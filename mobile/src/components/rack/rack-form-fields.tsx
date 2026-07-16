import { useEffect, useRef } from "react";
import { type BaseRecord, useList } from "@refinedev/core";
import {
  type Control,
  type FieldValues,
  useController,
  useWatch,
} from "react-hook-form";
import { View } from "react-native";

import {
  FieldWrapper,
  RelationSelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { labelZone } from "@/lib/labels";

const orderLabel = (o: BaseRecord) =>
  [o.orderNumber, o.name].filter(Boolean).join(" · ");

export function RackFormFields({ control }: { control: Control<FieldValues> }) {
  // A rack may only be dedicated to an order of its zone's project.
  const zoneId = useWatch({ control, name: "zoneId" }) as
    | string
    | null
    | undefined;

  const { result: zones } = useList<BaseRecord>({
    resource: "zones",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const zoneProjectId =
    ((zones?.data ?? []).find((z) => z.id === zoneId)?.projectId as
      | string
      | null
      | undefined) ?? null;

  const order = useController({ control, name: "orderId", defaultValue: null });

  // Reset the order when the zone's project changes.
  const prev = useRef(zoneProjectId);
  useEffect(() => {
    if (prev.current !== zoneProjectId) {
      const wasReal = prev.current != null;
      prev.current = zoneProjectId;
      if (wasReal) order.field.onChange(null);
    }
  }, [zoneProjectId, order.field]);

  const { result: orders } = useList<BaseRecord>({
    resource: "orders",
    pagination: { mode: "off" },
    filters: zoneProjectId
      ? [{ field: "projectId", operator: "eq", value: zoneProjectId }]
      : [],
    queryOptions: { enabled: !!zoneProjectId, retry: false },
    errorNotification: false,
  });
  const orderOptions = (orders?.data ?? []).map((o) => ({
    label: orderLabel(o),
    value: String(o.id),
  }));

  return (
    <View className="gap-4">
      <RelationSelectField
        control={control}
        name="zoneId"
        label="Zone"
        resource="zones"
        getLabel={labelZone}
        placeholder="Select zone"
        rules={{ required: "Zone is required" }}
      />
      <TextField
        control={control}
        name="code"
        label="Code"
        placeholder="R-01"
        autoCapitalize="characters"
        rules={{ required: "Code is required" }}
      />
      <TextField control={control} name="name" label="Name" />
      <FieldWrapper label="Dedicated to order (optional)">
        <SearchableSelect
          value={order.field.value ? String(order.field.value) : null}
          onChange={order.field.onChange}
          options={orderOptions}
          placeholder={
            zoneProjectId
              ? "Select an order"
              : "Pick a project-zone first"
          }
          disabled={!zoneProjectId}
          allowClear
        />
      </FieldWrapper>
      <TextAreaField control={control} name="description" label="Description" />
      <SwitchField control={control} name="isActive" label="Active" />
    </View>
  );
}
