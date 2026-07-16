import { useLocalSearchParams } from "expo-router";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { CustomerFormFields } from "@/components/customer/customer-form-fields";

export default function CustomerEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ResourceForm
      resource="customers"
      action="edit"
      id={id}
      title="Edit customer"
    >
      {(control) => <CustomerFormFields control={control} />}
    </ResourceForm>
  );
}
