import { useEffect, useState } from "react";

import { getAccessState, type AccessState } from "@/providers/access-control";

/** Empty catalogue → every resource allowed (the provider's fail-open shape). */
const FAIL_OPEN: AccessState = {
  perms: new Set(),
  keys: new Set(),
  isAdmin: false,
  responsibleWarehouseIds: [],
};

/**
 * Loads the current user's full access state (permissions, catalogue keys, admin
 * flag, warehouse responsibilities) for gating navigation (the drawer filter).
 * Cached in the provider, so this resolves instantly after the first load.
 *
 * On failure it RETRIES with backoff instead of settling immediately: a
 * transient error at cold start must not leave the menu unfiltered for the rest
 * of the session. Only after repeated failures does it fail open (so a dead
 * network never hides the whole menu), and it keeps retrying in the background
 * to converge on the real state.
 */
export function useAccessState(): { ready: boolean; state: AccessState | null } {
  const [state, setState] = useState<AccessState | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const tick = () => {
      getAccessState()
        .then((s) => {
          if (active) setState(s);
        })
        .catch(() => {
          if (!active) return;
          attempt += 1;
          // Never downgrade a real state; only fill in fail-open after the
          // second consecutive failure so the menu isn't blank forever.
          if (attempt >= 2) setState((prev) => prev ?? FAIL_OPEN);
          timer = setTimeout(tick, Math.min(2_000 * attempt, 15_000));
        });
    };
    tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { ready: state !== null, state };
}
