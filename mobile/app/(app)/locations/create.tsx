import { ResourceForm } from "@/components/refine-ui/resource-form";
import { LocationFormFields } from "@/components/location/location-form-fields";

export default function LocationCreateScreen() {
  return (
    <ResourceForm
      resource="locations"
      action="create"
      title="New location"
      defaultValues={{ isActive: true }}
    >
      {(control) => <LocationFormFields control={control} />}
    </ResourceForm>
  );
}
