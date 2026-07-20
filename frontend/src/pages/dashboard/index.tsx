import { useGetIdentity, useList } from "@refinedev/core";
import {
  ClipboardList,
  Factory,
  Lock,
  Package,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";

import { KpiCard } from "@/components/refine-ui/kpi-card";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccessState } from "@/hooks/use-access-state";
import { cn } from "@/lib/utils";
import { CheckoutCards, useMyCheckouts } from "./my-checkouts";
import { WorkerDashboard } from "./worker-dashboard";

interface Identity {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

function useTotal(resource: string, extra?: Record<string, unknown>): number {
  const { result } = useList({
    resource,
    pagination: { pageSize: 1 },
    ...extra,
  });
  return result?.total ?? 0;
}

interface LocationCell {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface AuditRow {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId: string | null;
  actorEmail: string | null;
  createdAt: string;
}

const AUDIT_ICON: Record<AuditRow["action"], LucideIcon> = {
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
};

const AUDIT_TONE: Record<AuditRow["action"], string> = {
  CREATE: "bg-success/10 text-success",
  UPDATE: "bg-info/10 text-info",
  DELETE: "bg-destructive/10 text-destructive",
};

/**
 * Admin/non-worker split: the classic telemetry dashboard reads resources a
 * plain member cannot (materials/tools/stock/locations/audit → 403s), so
 * members get their own self-scoped WorkerDashboard instead.
 */
export const Dashboard = () => {
  const { ready, state } = useAccessState();
  if (!ready) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  return state?.isAdmin ? <AdminDashboard /> : <WorkerDashboard />;
};

const AdminDashboard = () => {
  const { data: identity } = useGetIdentity<Identity>();
  // Admins can receive/scan too — surface their own custody when non-empty.
  const {
    stockItems: myStockItems,
    tools: myTools,
    products: myProducts,
  } = useMyCheckouts();

  const materials = useTotal("materials");
  const openOrders = useTotal("orders");
  const toolsInUse = useTotal("tools", {
    filters: [{ field: "status", operator: "eq", value: "in_use" }],
  });
  // Reservations were folded into the single stock-item table: a reservation is
  // now a stock item split off into the "reserved" status (see stock-items).
  const activeReservations = useTotal("stock-items", {
    filters: [{ field: "status", operator: "eq", value: "reserved" }],
  });

  const { result: locations } = useList<LocationCell>({
    resource: "locations",
    pagination: { pageSize: 12 },
    sorters: [{ field: "code", order: "asc" }],
  });

  const { result: audit } = useList<AuditRow>({
    resource: "audit-logs",
    pagination: { pageSize: 7 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const cells = locations?.data ?? [];
  const events = audit?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Production Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome{identity?.name ? `, ${identity.name}` : ""} — real-time shop-floor
          &amp; inventory telemetry.
        </p>
      </div>

      {/* KPI strip */}
      <section
        aria-label="Key figures"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Materials"
          value={materials}
          icon={Package}
          tone="primary"
          hint="Tracked materials"
          to="/materials"
        />
        <KpiCard
          label="Active Orders"
          value={openOrders}
          icon={ClipboardList}
          tone="primary"
          hint="In production pipeline"
          to="/projects"
        />
        <KpiCard
          label="Tools In Use"
          value={toolsInUse}
          icon={Wrench}
          tone="info"
          valueTone={toolsInUse > 0 ? "info" : "neutral"}
          hint="Checked out to stages"
          to="/tools"
        />
        <KpiCard
          label="Active Reservations"
          value={activeReservations}
          icon={Lock}
          tone="primary"
          hint="Committed stock"
          to="/materials"
        />
      </section>

      {/* Own custody (zimmet) — anyone who received something must see it. */}
      {(myStockItems.length > 0 ||
        myTools.length > 0 ||
        myProducts.length > 0) && (
        <CheckoutCards
          stockItems={myStockItems}
          tools={myTools}
          products={myProducts}
        />
      )}

      {/* Live grid + audit feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Production Grid */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Factory className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Live Production Grid</h2>
          </div>
          <div className="rounded-lg border bg-card/40 p-4 data-grid-dots">
            {cells.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {cells.map((cell) => (
                  <Link
                    key={cell.id}
                    to={`/locations/${cell.id}`}
                    className={cn(
                      "group flex flex-col justify-between rounded-lg border border-l-4 bg-card p-3 transition-colors hover:border-primary",
                      cell.isActive ? "border-l-primary" : "border-l-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {cell.code}
                      </span>
                      <StatusBadge
                        tone={cell.isActive ? "success" : "neutral"}
                        label={cell.isActive ? "In-Op" : "Standby"}
                      />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-medium text-foreground">
                      {cell.name}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <Factory className="size-8 text-primary/40" />
                No production locations registered yet.
              </div>
            )}
          </div>
        </section>

        {/* Recent Audit Log */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <ScrollText className="size-4 text-warning" />
            <h2 className="text-base font-semibold">Recent Audit Log</h2>
          </div>
          <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Log Stream
              </span>
              <span className="text-[10px] text-muted-foreground">
                Newest first
              </span>
            </div>
            <div className="divide-y divide-border">
              {events.length ? (
                events.map((e) => {
                  const Icon = AUDIT_ICON[e.action];
                  return (
                    <div
                      key={e.id}
                      className="flex gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          AUDIT_TONE[e.action],
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {e.action} · {e.entity}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {new Date(e.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="truncate text-[13px] text-muted-foreground">
                          {e.actorEmail ?? "system"}
                          {e.entityId ? ` · ${e.entityId}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No audit activity yet.
                </div>
              )}
            </div>
            <Link
              to="/audit-logs"
              className="border-t bg-muted/40 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
            >
              View Full Audit History
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};
