import { useLocalSearchParams } from "expo-router";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { ToolFormFields } from "@/components/tool/tool-form-fields";

export default function ToolEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ResourceForm resource="tools" action="edit" id={id} title="Edit tool">
      {(control) => <ToolFormFields control={control} />}
    </ResourceForm>
  );
}
