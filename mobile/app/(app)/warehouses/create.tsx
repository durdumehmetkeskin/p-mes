import { ResourceForm } from "@/components/refine-ui/resource-form";
import { WarehouseFormFields } from "@/components/warehouse/warehouse-form-fields";

export default function WarehouseCreateScreen() {
  return (
    <ResourceForm
      resource="warehouses"
      action="create"
      title="New warehouse"
      defaultValues={{ isActive: true }}
    >
      {(control) => <WarehouseFormFields control={control} />}
    </ResourceForm>
  );
}
