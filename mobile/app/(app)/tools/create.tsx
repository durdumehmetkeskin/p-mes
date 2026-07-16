import { ResourceForm } from "@/components/refine-ui/resource-form";
import { ToolFormFields } from "@/components/tool/tool-form-fields";

export default function ToolCreateScreen() {
  return (
    <ResourceForm
      resource="tools"
      action="create"
      title="New tool"
      defaultValues={{ status: "available", isActive: true }}
    >
      {(control) => <ToolFormFields control={control} />}
    </ResourceForm>
  );
}
