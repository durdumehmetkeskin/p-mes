import { useLocalSearchParams } from "expo-router";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { WarehouseFormFields } from "@/components/warehouse/warehouse-form-fields";

export default function WarehouseEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ResourceForm
      resource="warehouses"
      action="edit"
      id={id}
      title="Edit warehouse"
    >
      {(control) => <WarehouseFormFields control={control} />}
    </ResourceForm>
  );
}
