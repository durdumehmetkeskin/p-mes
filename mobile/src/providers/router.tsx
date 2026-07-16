import React from "react";
import type {
  GoConfig,
  ParseResponse,
  ResourceProps,
  RouterProvider,
} from "@refinedev/core";
import {
  Link as ExpoLink,
  router as expoRouter,
  useGlobalSearchParams,
  usePathname,
} from "expo-router";

import { resources as appResources } from "./resources";

/**
 * Custom Refine routerProvider bound to expo-router (replaces
 * @refinedev/react-router, which is DOM-only). Implements go/back/parse/Link so
 * Refine's useNavigation / redirectTo / resource inference work on native. The
 * resource list is read directly from our own registry rather than Refine
 * context (v5 dropped the public useResource export).
 */

function routeTemplate(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "path" in value) {
    const p = (value as { path?: unknown }).path;
    return typeof p === "string" ? p : undefined;
  }
  return undefined;
}

/** Does a `:param` template match a concrete pathname (segment-wise)? */
function matchTemplate(template: string, pathname: string): boolean {
  const t = template.split("/").filter(Boolean);
  const p = pathname.split("/").filter(Boolean);
  if (t.length !== p.length) return false;
  return t.every((seg, i) => seg.startsWith(":") || seg === p[i]);
}

function serializeQuery(query?: Record<string, unknown>): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      v.forEach((item) =>
        parts.push(
          `${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`,
        ),
      );
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.join("&");
}

/** Resolve a Refine `to` (string, {pathname}, or {resource,action,id}) to a path. */
function resolveTo(
  to: GoConfig["to"],
  resources: readonly ResourceProps[],
): string | undefined {
  if (!to) return undefined;
  if (typeof to === "string") return to;

  const obj = to as {
    pathname?: string;
    resource?: string;
    action?: string;
    id?: string | number;
  };
  if (obj.pathname) return obj.pathname;

  if (obj.resource && obj.action) {
    const res = resources.find((r) => r.name === obj.resource);
    if (!res) return undefined;
    const tpl = routeTemplate(
      (res as unknown as Record<string, unknown>)[obj.action],
    );
    if (!tpl) return undefined;
    return obj.id != null ? tpl.replace(":id", String(obj.id)) : tpl;
  }
  return undefined;
}

export const routerProvider: RouterProvider = {
  go: () => {
    return (config: GoConfig) => {
      const path = resolveTo(config.to, appResources);
      if (!path) return undefined;
      const qs = serializeQuery(
        config.query as Record<string, unknown> | undefined,
      );
      const hash = config.hash ? `#${config.hash.replace(/^#/, "")}` : "";
      const url = `${path}${qs ? `?${qs}` : ""}${hash}`;

      if (config.type === "path") return url;
      if (config.type === "replace") {
        expoRouter.replace(url as never);
      } else {
        expoRouter.push(url as never);
      }
      return undefined;
    };
  },

  back: () => () => {
    if (expoRouter.canGoBack()) expoRouter.back();
  },

  parse: () => {
    const pathname = usePathname();
    const params = useGlobalSearchParams();

    return () => {
      let matched: ResourceProps | undefined;
      let action: ParseResponse["action"];

      outer: for (const res of appResources) {
        const candidates: Array<[ParseResponse["action"], unknown]> = [
          ["edit", (res as unknown as Record<string, unknown>).edit],
          ["create", (res as unknown as Record<string, unknown>).create],
          ["show", (res as unknown as Record<string, unknown>).show],
          ["list", (res as unknown as Record<string, unknown>).list],
        ];
        for (const [act, value] of candidates) {
          const tpl = routeTemplate(value);
          if (tpl && matchTemplate(tpl, pathname)) {
            matched = res;
            action = act;
            break outer;
          }
        }
      }

      const id = (params.id as string | undefined) ?? undefined;
      return {
        resource: matched,
        action,
        id,
        pathname,
        params: { ...params, id },
      } as ParseResponse;
    };
  },

  Link: React.forwardRef<
    React.ComponentRef<typeof ExpoLink>,
    { to: string } & Record<string, unknown>
  >(function RefineLink({ to, ...rest }, ref) {
    return <ExpoLink ref={ref} href={to as never} {...rest} />;
  }),
};
