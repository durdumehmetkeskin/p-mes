import { useOne } from "@refinedev/core";
import { useOutletContext } from "react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCanEditProject } from "@/hooks/use-can-edit-project";
import { usePermissions } from "@/hooks/use-permissions";
import { AttachmentsPanel } from "./attachments-panel";
import type { ProjectContext } from "./project-workspace";

export const ProjectFiles = () => {
  const { projectId } = useOutletContext<ProjectContext>();
  // Project files are managed only by an admin or the project's manager
  // (backend mirrors with a 403); members read/download only.
  const { result: project } = useOne<{ managerUserId: string | null }>({
    resource: "projects",
    id: projectId,
    queryOptions: { enabled: Boolean(projectId) },
  });
  const canEditProject = useCanEditProject();
  const { has } = usePermissions();
  const canManage = canEditProject(project?.managerUserId);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project files</CardTitle>
      </CardHeader>
      <CardContent>
        <AttachmentsPanel
          ownerType="project"
          ownerId={projectId}
          title="Files"
          canUpload={canManage && has("attachments:create")}
          canDelete={canManage && has("attachments:delete")}
        />
      </CardContent>
    </Card>
  );
};
