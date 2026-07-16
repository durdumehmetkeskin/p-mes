import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * Renders children only when the user holds the given permission key(s).
 * Pass a single key or an array (all required). Renders nothing until the
 * permission set has loaded, to avoid flashing forbidden actions.
 */
export function Can({
  perm,
  children,
}: {
  perm: string | string[];
  children: ReactNode;
}) {
  const { has, ready } = usePermissions();
  if (!ready) return null;
  const keys = Array.isArray(perm) ? perm : [perm];
  return keys.every(has) ? <>{children}</> : null;
}
