import { ResourceForm } from "@/components/refine-ui/resource-form";
import { CustomerFormFields } from "@/components/customer/customer-form-fields";

export default function CustomerCreateScreen() {
  return (
    <ResourceForm
      resource="customers"
      action="create"
      title="New customer"
      defaultValues={{ isActive: true }}
    >
      {(control) => <CustomerFormFields control={control} />}
    </ResourceForm>
  );
}
