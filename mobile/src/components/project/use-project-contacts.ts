import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { axiosInstance } from "@/providers/axios";

export interface ProjectContact {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

const attachedKey = (id: string) => ["project-contacts", id];
const assignableKey = (id: string) => ["assignable-contacts", id];

/**
 * A project's attached contacts (a subset of its customer's contacts) plus the
 * assignable pool. Mirrors {@link useTeamMembers}: React-Query keyed by
 * projectId so callers share one request/cache.
 */
export function useProjectContacts(projectId?: string) {
  const qc = useQueryClient();

  const attachedQ = useQuery({
    queryKey: attachedKey(projectId ?? ""),
    enabled: !!projectId,
    staleTime: 60_000,
    retry: false,
    queryFn: async () =>
      (
        await axiosInstance.get<ProjectContact[]>(
          `/projects/${projectId}/contacts`,
        )
      ).data ?? [],
  });

  const assignableQ = useQuery({
    queryKey: assignableKey(projectId ?? ""),
    enabled: !!projectId,
    staleTime: 60_000,
    retry: false,
    queryFn: async () =>
      (
        await axiosInstance.get<ProjectContact[]>(
          `/projects/${projectId}/assignable-contacts`,
        )
      ).data ?? [],
  });

  const refresh = useCallback(() => {
    if (!projectId) return;
    qc.invalidateQueries({ queryKey: attachedKey(projectId) });
    qc.invalidateQueries({ queryKey: assignableKey(projectId) });
  }, [projectId, qc]);

  const attach = useCallback(
    async (contactId: string) => {
      if (!projectId) return;
      await axiosInstance.post(`/projects/${projectId}/contacts`, { contactId });
      refresh();
    },
    [projectId, refresh],
  );

  const detach = useCallback(
    async (contactId: string) => {
      if (!projectId) return;
      await axiosInstance.delete(`/projects/${projectId}/contacts/${contactId}`);
      refresh();
    },
    [projectId, refresh],
  );

  return {
    contacts: attachedQ.data ?? [],
    assignable: assignableQ.data ?? [],
    loading: attachedQ.isLoading || assignableQ.isLoading,
    refresh,
    attach,
    detach,
  };
}
