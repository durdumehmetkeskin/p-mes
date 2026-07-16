import { useEffect, useState } from "react";

import { getPermissionSet } from "@/providers/access-control";

/**
 * Effective permission keys for the current user, for gating custom UI (nav
 * items, action buttons) that aren't Refine CRUD buttons. Fails closed on
 * error (empty set) but `ready` lets callers avoid flicker.
 */
export function usePermissions() {
  const [perms, setPerms] = useState<Set<string> | null>(null);

  useEffect(() => {
    let active = true;
    getPermissionSet()
      .then((p) => {
        if (active) setPerms(p);
      })
      .catch(() => {
        if (active) setPerms(new Set());
      });
    return () => {
      active = false;
    };
  }, []);

  return {
    ready: perms !== null,
    has: (key: string) => perms?.has(key) ?? false,
  };
}
