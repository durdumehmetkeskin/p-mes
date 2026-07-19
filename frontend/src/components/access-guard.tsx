import type { ReactNode } from "react";
import { useResourceParams } from "@refinedev/core";

import { Forbidden } from "@/components/refine-ui/layout/forbidden";
import { useAccessState } from "@/hooks/use-access-state";
import { canAccessResource } from "@/providers/access-control";

/**
 * Route-level read gate. Renders the 403 page when the current route's resource
 * is one the user has no read access to; otherwise renders the page. Ungated
 * routes (dashboard, action pages, anything not in the permission catalogue) and
 * admins always pass. Mirrors the sidebar filter so hidden areas also 403 on
 * direct URL navigation.
 */
export function AccessGuard({ children }: { children: ReactNode }) {
  const { resource, action } = useResourceParams();
  const { ready, state } = useAccessState();

  // Wait for the (cached, fast) access state before deciding, so we never flash
  // a forbidden page or leak a forbidden one.
  if (!ready || !state) return null;
  if (!canAccessResource(state, resource?.name, action ?? "list")) {
    return <Forbidden />;
  }
  return <>{children}</>;
}
