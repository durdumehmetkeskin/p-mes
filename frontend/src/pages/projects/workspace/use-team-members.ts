import { useEffect, useState } from "react";
import { axiosInstance } from "@/providers/axios";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

/** The project's assigned team members — candidates for "responsible" pickers. */
export function useTeamMembers(projectId?: string): TeamMember[] {
  const [members, setMembers] = useState<TeamMember[]>([]);
  useEffect(() => {
    if (!projectId) return;
    axiosInstance
      .get<TeamMember[]>(`/projects/${projectId}/members`)
      .then(({ data }) => setMembers(data))
      .catch(() => setMembers([]));
  }, [projectId]);
  return members;
}
