import { useAccessState } from "@/hooks/use-access-state";

/**
 * Exposes the current user's effective permission keys for gating custom UI
 * (the Admin role implicitly has every key, so `has` returns true for them).
 *
 * Derived from {@link useAccessState} — `perms` is a field of the same cached
 * AccessState — so there is a single load/fail-open contract to maintain.
 */
export function usePermissions() {
  const { ready, state } = useAccessState();

  return {
    ready,
    has: (key: string) => state?.perms.has(key) ?? false,
  };
}
