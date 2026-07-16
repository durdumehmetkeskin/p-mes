import type { ReactNode } from "react";
import { useCan } from "@refinedev/core";

/**
 * Permission gate (RN port of the web <Can>). Renders children only if the user
 * can perform `action` on `resource`; fail-open (undefined/loading -> shown),
 * matching the accessControlProvider.
 */
export function Can({
  resource,
  action = "list",
  children,
  fallback = null,
}: {
  resource: string;
  action?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { data } = useCan({
    resource,
    action,
    params: { resource: { name: resource } },
  });
  if (data?.can === false) return <>{fallback}</>;
  return <>{children}</>;
}
