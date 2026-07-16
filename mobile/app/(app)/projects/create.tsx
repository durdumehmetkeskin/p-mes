import { ResourceForm } from "@/components/refine-ui/resource-form";
import { ProjectFormFields } from "@/components/project/project-form-fields";

export default function ProjectCreateScreen() {
  return (
    <ResourceForm resource="projects" action="create" title="New project">
      {(control) => <ProjectFormFields control={control} mode="create" />}
    </ResourceForm>
  );
}
