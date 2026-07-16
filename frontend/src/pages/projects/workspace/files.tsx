import { useOutletContext } from "react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentsPanel } from "./attachments-panel";
import type { ProjectContext } from "./project-workspace";

export const ProjectFiles = () => {
  const { projectId } = useOutletContext<ProjectContext>();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project files</CardTitle>
      </CardHeader>
      <CardContent>
        <AttachmentsPanel ownerType="project" ownerId={projectId} title="Files" />
      </CardContent>
    </Card>
  );
};
