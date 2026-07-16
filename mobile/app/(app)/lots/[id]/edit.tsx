import { useLocalSearchParams } from "expo-router";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { LotFormFields } from "@/components/lot/lot-form-fields";

export default function LotEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ResourceForm resource="lots" action="edit" id={id} title="Edit lot">
      {(control) => <LotFormFields control={control} />}
    </ResourceForm>
  );
}
