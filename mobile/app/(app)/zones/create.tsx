import { ResourceForm } from "@/components/refine-ui/resource-form";
import { ZoneFormFields } from "@/components/zone/zone-form-fields";

export default function ZoneCreateScreen() {
  return (
    <ResourceForm
      resource="zones"
      action="create"
      title="New zone"
      defaultValues={{ isActive: true }}
    >
      {(control) => <ZoneFormFields control={control} />}
    </ResourceForm>
  );
}
