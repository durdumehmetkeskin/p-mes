import { useEffect, useState } from "react";

import { getAccessState, type AccessState } from "@/providers/access-control";

/**
 * Loads the current user's full access state (permissions, catalogue keys, admin
 * flag, warehouse responsibilities) once and exposes it for gating navigation
 * (the drawer filter). Cached in the provider, so this resolves instantly after
 * the first load. On a network error it fails OPEN (empty catalogue → every
 * resource allowed) so a hiccup never hides the whole menu.
 */
export function useAccessState(): { ready: boolean; state: AccessState | null } {
  const [state, setState] = useState<AccessState | null>(null);

  useEffect(() => {
    let active = true;
    getAccessState()
      .then((s) => active && setState(s))
      .catch(
        () =>
          active &&
          setState({
            perms: new Set(),
            keys: new Set(),
            isAdmin: false,
            responsibleWarehouseIds: [],
          }),
      );
    return () => {
      active = false;
    };
  }, []);

  return { ready: state !== null, state };
}
