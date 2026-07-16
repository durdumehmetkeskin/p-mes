import { useLocalSearchParams, useRouter } from "expo-router";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { ProjectFormFields } from "@/components/project/project-form-fields";

export default function ProjectEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <ResourceForm
      resource="projects"
      action="edit"
      id={id}
      title="Edit project"
      redirect={false}
      onSuccess={() => {
        if (router.canGoBack()) router.back();
      }}
    >
      {(control) => <ProjectFormFields control={control} mode="edit" />}
    </ResourceForm>
  );
}
