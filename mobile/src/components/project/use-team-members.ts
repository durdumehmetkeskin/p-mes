import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { axiosInstance } from "@/providers/axios";

export interface Member {
  id: string;
  name?: string;
  email?: string;
}

const membersKey = (id: string) => ["team-members", id];
const assignableKey = (id: string) => ["assignable-users", id];

/**
 * Project team members + assignable candidates. Backed by React Query (keyed by
 * projectId) so many callers on one screen (e.g. every ProcessCard) share ONE
 * request and a cache instead of each firing raw axios on mount.
 */
export function useTeamMembers(projectId?: string) {
  const qc = useQueryClient();

  const membersQ = useQuery({
    queryKey: membersKey(projectId ?? ""),
    enabled: !!projectId,
    staleTime: 60_000,
    retry: false,
    queryFn: async () =>
      (await axiosInstance.get<Member[]>(`/projects/${projectId}/members`))
        .data ?? [],
  });

  const assignableQ = useQuery({
    queryKey: assignableKey(projectId ?? ""),
    enabled: !!projectId,
    staleTime: 60_000,
    retry: false,
    queryFn: async () =>
      (
        await axiosInstance.get<Member[]>(
          `/projects/${projectId}/assignable-users`,
        )
      ).data ?? [],
  });

  const refresh = useCallback(() => {
    if (!projectId) return;
    qc.invalidateQueries({ queryKey: membersKey(projectId) });
    qc.invalidateQueries({ queryKey: assignableKey(projectId) });
  }, [projectId, qc]);

  const addMember = useCallback(
    async (userId: string) => {
      if (!projectId) return;
      await axiosInstance.post(`/projects/${projectId}/members`, { userId });
      refresh();
    },
    [projectId, refresh],
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!projectId) return;
      await axiosInstance.delete(`/projects/${projectId}/members/${userId}`);
      refresh();
    },
    [projectId, refresh],
  );

  return {
    members: membersQ.data ?? [],
    assignable: assignableQ.data ?? [],
    loading: membersQ.isLoading || assignableQ.isLoading,
    refresh,
    addMember,
    removeMember,
  };
}
