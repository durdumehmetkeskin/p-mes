import { useLocalSearchParams } from "expo-router";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { RackFormFields } from "@/components/rack/rack-form-fields";

export default function RackEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ResourceForm resource="racks" action="edit" id={id} title="Edit rack">
      {(control) => <RackFormFields control={control} />}
    </ResourceForm>
  );
}
