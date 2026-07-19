import { useGetIdentity } from "@refinedev/core";
import { useCallback } from "react";

import { useIsAdmin } from "./use-is-admin";

/**
 * Editing a project is reserved to admins and that project's manager (the
 * backend enforces the same rule with a 403). Returns a predicate so list
 * rows can be checked per project.
 */
export function useCanEditProject(): (
  managerUserId?: string | null,
) => boolean {
  const isAdmin = useIsAdmin();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;
  return useCallback(
    (managerUserId?: string | null) =>
      isAdmin || (!!userId && userId === managerUserId),
    [isAdmin, userId],
  );
}
