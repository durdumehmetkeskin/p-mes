import { useEffect, useState } from "react";

import { getWarehouseAccess } from "@/providers/access-control";

/**
 * Whether the current user has the Admin role. Used to gate the QR-only handover
 * actions: non-admins must scan the item's QR to deliver/receive/return, while
 * an admin may act from the on-screen buttons.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    getWarehouseAccess()
      .then((a) => {
        if (active) setIsAdmin(a.isAdmin);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return isAdmin;
}
