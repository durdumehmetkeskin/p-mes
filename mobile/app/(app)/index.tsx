import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useList } from "@refinedev/core";
import { format, formatDistanceToNow, isSameDay, parseISO } from "date-fns";
import { Factory, FolderKanban, Package, Wrench } from "lucide-react-native";
import { useRouter } from "expo-router";

import { Can } from "@/components/can";
import { KpiCard, type KpiTone } from "@/components/refine-ui/kpi-card";
import { Screen } from "@/components/refine-ui/screen";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { axiosInstance } from "@/providers/axios";
import type { LucideIcon } from "lucide-react-native";

function useCount(resource: string, enabled: boolean): number | undefined {
  const { result } = useList({
    resource,
    pagination: { pageSize: 1 },
    errorNotification: false,
    queryOptions: { retry: false, enabled },
  });
  return result.total;
}

function Kpi({
  label,
  resource,
  icon,
  tone,
  to,
}: {
  label: string;
  resource: string;
  icon: LucideIcon;
  tone: KpiTone;
  to: string;
}) {
  const total = useCount(resource, true);
  return (
    <View className="w-[48%]">
      <KpiCard
        label={label}
        value={total ?? "—"}
        icon={icon}
        tone={tone}
        mono
        to={to}
      />
    </View>
  );
}

interface AuditLog extends BaseRecord {
  action?: string;
  entity?: string;
  createdAt?: string;
}

function RecentActivity() {
  const router = useRouter();
  const { query, result } = useList<AuditLog>({
    resource: "audit-logs",
    pagination: { pageSize: 8 },
    sorters: [{ field: "createdAt", order: "desc" }],
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const isLoading = query.isLoading;
  const rows = result.data ?? [];

  return (
    <View className="rounded-lg border border-border bg-card">
      <View className="flex-row items-center justify-between border-b border-border p-4">
        <Text className="font-sans-semibold text-base text-card-foreground">
          Recent activity
        </Text>
        <Text
          onPress={() => router.push("/audit-logs")}
          className="text-xs text-primary"
        >
          View all
        </Text>
      </View>
      {isLoading ? (
        <Text className="p-4 text-sm text-muted-foreground">Loading…</Text>
      ) : rows.length === 0 ? (
        <Text className="p-4 text-sm text-muted-foreground">No activity yet.</Text>
      ) : (
        rows.map((log, i) => (
          <View
            key={log.id ?? i}
            className={i > 0 ? "flex-row items-center gap-3 border-t border-border p-3" : "flex-row items-center gap-3 p-3"}
          >
            {log.action ? <StatusBadge label={log.action} /> : null}
            <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
              {log.entity ?? "—"}
            </Text>
            {log.createdAt ? (
              <Text className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

// ---- Worker widgets (self-scoped endpoints — never 403 for a member) ----

interface StageCard {
  id: string;
  name: string;
  sequence: number;
  status: string;
  projectId: string;
  projectName: string;
  orderId: string | null;
  orderNumber: string | null;
  estimatedStartDate: string | null;
  estimatedCompletedDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
}
interface MyStockItem {
  id: string;
  quantity: number;
  status: string;
  material: { code: string; name: string; unit: string | null } | null;
  stageName: string | null;
}
interface MyTool {
  id: string;
  status: string;
  tool: { code: string; name: string } | null;
  stageName: string | null;
}
interface MyProduct {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string | null;
  stageName: string | null;
}

interface MyResponsibility {
  id: string;
  overallStatus: string;
  projectId: string | null;
  orderId: string | null;
  projectName: string | null;
  orderNumber: string | null;
  orderItemName: string | null;
  completedStages: number;
  totalStages: number;
  stages: Array<{ id: string; name: string; sequence: number; status: string }>;
}

function stageActiveOn(c: StageCard, day: Date): boolean {
  const s = c.startedAt ?? c.estimatedStartDate;
  const e = c.completedAt ?? c.estimatedCompletedDate;
  const start = s ? parseISO(s.slice(0, 10)) : null;
  const end = e ? parseISO(e.slice(0, 10)) : null;
  if (start && end) return day >= start && day <= end;
  if (start && !end)
    return isSameDay(start, day) || (c.status === "in_progress" && day >= start);
  return c.status === "in_progress";
}

function MyWork() {
  const router = useRouter();
  const [cards, setCards] = useState<StageCard[]>([]);
  const [stockItems, setStockItems] = useState<MyStockItem[]>([]);
  const [tools, setTools] = useState<MyTool[]>([]);
  const [products, setProducts] = useState<MyProduct[]>([]);
  const [responsibilities, setResponsibilities] = useState<MyResponsibility[]>(
    [],
  );

  useEffect(() => {
    let mounted = true;
    axiosInstance
      .get<{ cards: StageCard[] }>("/stage-board")
      .then((r) => mounted && setCards(r.data.cards ?? []))
      .catch(() => mounted && setCards([]));
    axiosInstance
      .get<{
        stockItems: MyStockItem[];
        tools: MyTool[];
        products?: MyProduct[];
      }>("/my-work/checkouts")
      .then((r) => {
        if (!mounted) return;
        setStockItems(r.data.stockItems ?? []);
        setTools(r.data.tools ?? []);
        setProducts(r.data.products ?? []);
      })
      .catch(() => undefined);
    axiosInstance
      .get<MyResponsibility[]>("/my-work/responsibilities")
      .then((r) => mounted && setResponsibilities(r.data ?? []))
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const today = new Date();
  const open = cards.filter((c) => c.status !== "completed");
  const todayTasks = open.filter((c) => stageActiveOn(c, today));

  const stageRow = (c: StageCard, i: number) => (
    <Pressable
      key={c.id}
      onPress={() =>
        router.push(
          c.orderId
            ? `/projects/${c.projectId}/orders/${c.orderId}`
            : `/projects/${c.projectId}`,
        )
      }
      className={
        i > 0
          ? "flex-row items-center gap-2 border-t border-border p-3 active:bg-accent"
          : "flex-row items-center gap-2 p-3 active:bg-accent"
      }
    >
      <View className="flex-1">
        <Text className="text-sm text-foreground" numberOfLines={1}>
          {c.sequence}. {c.name}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {c.projectName}
          {c.orderNumber ? ` · ${c.orderNumber}` : ""}
        </Text>
      </View>
      <StatusBadge label={c.status} />
    </Pressable>
  );

  return (
    <>
      {/* Today's tasks */}
      <View className="rounded-lg border border-border bg-card">
        <View className="border-b border-border p-4">
          <Text className="font-sans-semibold text-base text-card-foreground">
            Bugünün İşleri ({todayTasks.length})
          </Text>
          <Text className="text-xs text-muted-foreground">
            {format(today, "dd.MM.yyyy")}
          </Text>
        </View>
        {todayTasks.length === 0 ? (
          <Text className="p-4 text-sm text-muted-foreground">
            Bugün için planlanmış iş yok.
          </Text>
        ) : (
          todayTasks.map(stageRow)
        )}
      </View>

      {/* All open assigned stages (the week ahead) */}
      <View className="rounded-lg border border-border bg-card">
        <View className="flex-row items-center justify-between border-b border-border p-4">
          <Text className="font-sans-semibold text-base text-card-foreground">
            Açık İşlerim ({open.length})
          </Text>
          <Text
            onPress={() => router.push("/board")}
            className="text-xs text-primary"
          >
            Board
          </Text>
        </View>
        {open.length === 0 ? (
          <Text className="p-4 text-sm text-muted-foreground">
            Atanmış açık iş yok.
          </Text>
        ) : (
          open.slice(0, 8).map(stageRow)
        )}
      </View>

      {/* Processes the user is responsible for — full stage progress. */}
      {responsibilities.length > 0 ? (
        <View className="rounded-lg border border-border bg-card">
          <View className="border-b border-border p-4">
            <Text className="font-sans-semibold text-base text-card-foreground">
              Sorumlu Olduğum Prosesler ({responsibilities.length})
            </Text>
          </View>
          {responsibilities.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() =>
                p.projectId && p.orderId
                  ? router.push(`/projects/${p.projectId}/orders/${p.orderId}`)
                  : undefined
              }
              className={
                i > 0
                  ? "gap-2 border-t border-border p-3 active:bg-accent"
                  : "gap-2 p-3 active:bg-accent"
              }
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text
                  className="flex-1 text-sm text-foreground"
                  numberOfLines={1}
                >
                  {p.projectName ?? "—"}
                  {p.orderNumber ? ` · ${p.orderNumber}` : ""}
                  {p.orderItemName ? ` · ${p.orderItemName}` : ""}
                </Text>
                <Text className="font-mono text-xs text-muted-foreground">
                  {p.completedStages}/{p.totalStages}
                </Text>
                <StatusBadge label={p.overallStatus} />
              </View>
              <View className="h-1.5 w-full overflow-hidden rounded bg-muted">
                <View
                  className="h-full rounded bg-primary"
                  style={{
                    width: `${
                      p.totalStages > 0
                        ? Math.round((p.completedStages / p.totalStages) * 100)
                        : 0
                    }%`,
                  }}
                />
              </View>
              <View className="flex-row flex-wrap gap-1">
                {p.stages.map((st) => (
                  <View
                    key={st.id}
                    className="flex-row items-center gap-1 rounded border border-border px-1.5 py-0.5"
                  >
                    <Text className="text-[10px] text-muted-foreground">
                      {st.sequence}. {st.name}
                    </Text>
                    <StatusBadge label={st.status} />
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Checked-out items */}
      <View className="rounded-lg border border-border bg-card">
        <View className="border-b border-border p-4">
          <Text className="font-sans-semibold text-base text-card-foreground">
            Zimmetim — Malzeme ({stockItems.length}) · Araç ({tools.length})
            {products.length > 0 ? ` · Ürün (${products.length})` : ""}
          </Text>
        </View>
        {stockItems.length === 0 && tools.length === 0 && products.length === 0 ? (
          <Text className="p-4 text-sm text-muted-foreground">
            Üzerinize teslim edilmiş malzeme veya araç yok.
          </Text>
        ) : (
          <>
            {stockItems.map((it, i) => (
              <View
                key={it.id}
                className={
                  i > 0
                    ? "flex-row items-center gap-2 border-t border-border p-3"
                    : "flex-row items-center gap-2 p-3"
                }
              >
                <View className="flex-1">
                  <Text className="text-sm text-foreground" numberOfLines={1}>
                    {it.material?.code ?? "—"} {it.material?.name ?? ""}
                  </Text>
                  {it.stageName ? (
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                      {it.stageName}
                    </Text>
                  ) : null}
                </View>
                <Text className="font-mono text-xs text-foreground">
                  {it.quantity} {it.material?.unit ?? ""}
                </Text>
                <StatusBadge
                  label={it.status === "returning" ? "iade yolda" : "üzerimde"}
                />
              </View>
            ))}
            {tools.map((t, i) => (
              <View
                key={t.id}
                className={
                  stockItems.length > 0 || i > 0
                    ? "flex-row items-center gap-2 border-t border-border p-3"
                    : "flex-row items-center gap-2 p-3"
                }
              >
                <View className="flex-1">
                  <Text className="text-sm text-foreground" numberOfLines={1}>
                    {t.tool?.code ?? "—"} {t.tool?.name ?? ""}
                  </Text>
                  {t.stageName ? (
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                      {t.stageName}
                    </Text>
                  ) : null}
                </View>
                <StatusBadge
                  label={t.status === "returning" ? "iade yolda" : "üzerimde"}
                />
              </View>
            ))}
            {products.map((p, i) => (
              <View
                key={p.id}
                className={
                  stockItems.length > 0 || tools.length > 0 || i > 0
                    ? "flex-row items-center gap-2 border-t border-border p-3"
                    : "flex-row items-center gap-2 p-3"
                }
              >
                <View className="flex-1">
                  <Text className="text-sm text-foreground" numberOfLines={1}>
                    {p.code} {p.name}
                  </Text>
                  {p.stageName ? (
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                      Girdi: {p.stageName}
                    </Text>
                  ) : null}
                </View>
                <Text className="font-mono text-xs text-foreground">
                  {p.quantity} {p.unit ?? ""}
                </Text>
                <StatusBadge label="üzerimde" />
              </View>
            ))}
          </>
        )}
      </View>
    </>
  );
}

export default function DashboardScreen() {
  // KPI tiles read key-gated resources — render only the permitted ones so a
  // plain member's home screen carries no dead "—" tiles / 403 requests.
  const { has } = usePermissions();
  const isAdmin = useIsAdmin();
  return (
    <Screen title="Dashboard" tabBar>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {has("materials:read") && (
            <Kpi label="Materials" resource="materials" icon={Package} tone="primary" to="/materials" />
          )}
          {/* The Tools list is an admin-only area (tools:read alone only
              unlocks the embedded pickers/panels). */}
          {isAdmin && (
            <Kpi label="Tools" resource="tools" icon={Wrench} tone="info" to="/tools" />
          )}
          {has("projects:read") && (
            <Kpi label="Projects" resource="projects" icon={FolderKanban} tone="success" to="/projects" />
          )}
          {has("locations:read") && (
            <Kpi label="Locations" resource="locations" icon={Factory} tone="warning" to="/locations" />
          )}
        </View>

        {/* Worker widgets — self-scoped, safe for everyone. */}
        <MyWork />

        <Can resource="audit-logs" action="list">
          <RecentActivity />
        </Can>
      </ScrollView>
    </Screen>
  );
}
