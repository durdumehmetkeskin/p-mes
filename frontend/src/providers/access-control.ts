import type { AccessControlProvider } from "@refinedev/core";
import { axiosInstance } from "./axios";

interface CatalogItem {
  key: string;
}

// Refine resource name -> permission resource prefix (only where they differ).
const RESOURCE_ALIAS: Record<string, string> = {
  "audit-logs": "audit",
  // Report templates are gated by the shared reports:* permission keys.
  "report-definitions": "reports",
};

// LIST pages visible ONLY to admins even though everyone holds the read key —
// tools:read exists for the embedded pickers/StageTools panels and the tool
// detail page (warehouse responsibles operate tools from My Warehouse), not to
// browse the standalone Tools list.
const ADMIN_ONLY_LISTS = new Set(["tools"]);

export interface AccessState {
  perms: Set<string>;
  keys: Set<string>;
  isAdmin: boolean;
  // Warehouse ids the current user is responsible for (drives "My Warehouse").
  responsibleWarehouseIds: string[];
}

let cache: Promise<AccessState> | null = null;

async function load(): Promise<AccessState> {
  if (!cache) {
    cache = (async () => {
      const [me, cat] = await Promise.all([
        axiosInstance.get<{
          permissions?: string[];
          roles?: string[];
          responsibleWarehouseIds?: string[];
        }>("/auth/me"),
        axiosInstance.get<CatalogItem[]>("/permissions"),
      ]);
      return {
        perms: new Set(me.data.permissions ?? []),
        keys: new Set((cat.data ?? []).map((p) => p.key)),
        isAdmin: (me.data.roles ?? []).includes("admin"),
        responsibleWarehouseIds: me.data.responsibleWarehouseIds ?? [],
      };
    })();
    // Never cache a rejected promise — let the next call retry.
    cache.catch(() => {
      cache = null;
    });
  }
  return cache;
}

/** Drop the cached permissions (call on login/logout). */
export function resetAccessControl() {
  cache = null;
}

/** The current user's effective permission keys (used by usePermissions). */
export async function getPermissionSet(): Promise<Set<string>> {
  return (await load()).perms;
}

/** The full cached access state (used by the sidebar filter + route guard). */
export function getAccessState(): Promise<AccessState> {
  return load();
}

/**
 * Whether the user may open a resource's area (read/list access) — the same
 * rule the accessControlProvider applies for the `list` action, but synchronous
 * against an already-loaded {@link AccessState}. Ungated resources (not in the
 * catalogue, e.g. dashboard/action pages) and admins are always allowed.
 */
export function canAccessResource(
  state: AccessState,
  resource?: string,
  action = "list",
): boolean {
  if (!resource) return true;
  if (state.isAdmin) return true;
  if (ADMIN_ONLY_LISTS.has(resource) && action === "list") return false;
  if (resource === "my-warehouse") {
    return state.responsibleWarehouseIds.length > 0;
  }
  const key = requiredKey(resource, action);
  if (!state.keys.has(key)) return true;
  return state.perms.has(key);
}

/** Warehouses the current user is responsible for, plus their admin flag. */
export async function getWarehouseAccess(): Promise<{
  isAdmin: boolean;
  responsibleWarehouseIds: string[];
}> {
  const { isAdmin, responsibleWarehouseIds } = await load();
  return { isAdmin, responsibleWarehouseIds };
}

function requiredKey(resource: string, action?: string): string {
  const prefix = RESOURCE_ALIAS[resource] ?? resource;
  let suffix: string;
  switch (action) {
    case "create":
    case "clone":
      suffix = "create";
      break;
    case "edit":
      suffix = "update";
      break;
    case "delete":
      suffix = "delete";
      break;
    default: // list / show / anything else → read
      suffix = prefix === "audit" ? "view" : "read";
  }
  return `${prefix}:${suffix}`;
}

/**
 * Gates resources/actions by the user's effective permissions. A key that is
 * not part of the catalogue is treated as ungated (e.g. dashboard, groups).
 * Fails open on network errors so users are never locked out by a hiccup.
 */
export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    if (!resource) return { can: true };
    try {
      // "My Warehouse" is visible only to admins and warehouse responsibles.
      if (resource === "my-warehouse") {
        const { isAdmin, responsibleWarehouseIds } = await load();
        return { can: isAdmin || responsibleWarehouseIds.length > 0 };
      }
      if (ADMIN_ONLY_LISTS.has(resource) && (action === "list" || !action)) {
        const { isAdmin } = await load();
        if (!isAdmin) return { can: false };
      }
      const key = requiredKey(resource, action);
      const { perms, keys } = await load();
      if (!keys.has(key)) return { can: true };
      return { can: perms.has(key) };
    } catch {
      return { can: true };
    }
  },
  // Hide (not just disable) CRUD buttons the user cannot use.
  options: {
    buttons: { enableAccessControl: true, hideIfUnauthorized: true },
  },
};
