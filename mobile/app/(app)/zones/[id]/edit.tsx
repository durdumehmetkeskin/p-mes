import { useLocalSearchParams } from "expo-router";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { ZoneFormFields } from "@/components/zone/zone-form-fields";

export default function ZoneEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ResourceForm resource="zones" action="edit" id={id} title="Edit zone">
      {(control) => <ZoneFormFields control={control} />}
    </ResourceForm>
  );
}
