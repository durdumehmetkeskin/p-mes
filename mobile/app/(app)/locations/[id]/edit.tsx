import { useLocalSearchParams } from "expo-router";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { LocationFormFields } from "@/components/location/location-form-fields";

export default function LocationEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ResourceForm
      resource="locations"
      action="edit"
      id={id}
      title="Edit location"
    >
      {(control) => <LocationFormFields control={control} />}
    </ResourceForm>
  );
}
