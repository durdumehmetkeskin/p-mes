import { ResourceForm } from "@/components/refine-ui/resource-form";
import { RackFormFields } from "@/components/rack/rack-form-fields";

export default function RackCreateScreen() {
  return (
    <ResourceForm
      resource="racks"
      action="create"
      title="New rack"
      defaultValues={{ isActive: true }}
    >
      {(control) => <RackFormFields control={control} />}
    </ResourceForm>
  );
}
