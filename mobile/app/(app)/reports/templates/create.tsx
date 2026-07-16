import { ResourceForm } from "@/components/refine-ui/resource-form";
import { ReportDefinitionFormFields } from "@/components/report/report-definition-form-fields";

export default function ReportTemplateCreateScreen() {
  return (
    <ResourceForm
      resource="report-definitions"
      action="create"
      title="New template"
      defaultValues={{
        recipe: "chrome-pdf",
        engine: "handlebars",
        isActive: true,
      }}
    >
      {(control) => <ReportDefinitionFormFields control={control} />}
    </ResourceForm>
  );
}
