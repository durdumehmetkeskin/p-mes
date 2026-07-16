import { useEffect, useState } from "react";
import { getAccessState, type AccessState } from "@/providers/access-control";

/**
 * Loads the current user's full access state (permissions, catalogue keys,
 * admin flag, warehouse responsibilities) once and exposes it synchronously for
 * gating navigation (sidebar filter + route guard). Cached in the provider, so
 * this resolves instantly after the first load.
 */
export function useAccessState(): { ready: boolean; state: AccessState | null } {
  const [state, setState] = useState<AccessState | null>(null);

  useEffect(() => {
    let mounted = true;
    getAccessState()
      .then((s) => mounted && setState(s))
      .catch(
        () =>
          mounted &&
          setState({
            perms: new Set(),
            keys: new Set(),
            isAdmin: false,
            responsibleWarehouseIds: [],
          }),
      );
    return () => {
      mounted = false;
    };
  }, []);

  return { ready: state !== null, state };
}
