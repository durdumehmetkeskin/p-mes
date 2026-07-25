import { Boxes, Package, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  CheckoutCards,
  type MyCheckoutProduct,
  type MyStockItem,
  type MyTool,
} from "@/pages/dashboard/my-checkouts";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { axiosInstance } from "@/providers/axios";

interface PendingTool extends MyTool {
  reservedFrom: string | null;
  reservedTo: string | null;
}

interface CustodyHistoryRecord {
  id: string;
  itemType: "stock_item" | "tool" | "product";
  itemCode: string;
  itemName: string;
  lotNumber: string | null;
  unit: string | null;
  quantity: number | null;
  orderNumber: string | null;
  stageName: string | null;
  warehouseCode: string | null;
  receivedAt: string;
  returningAt: string | null;
  closedAt: string | null;
  closeAction: "returned" | "consumed" | "released" | null;
  returnedQuantity: number | null;
  usedQuantity: number | null;
}

interface MyCustody {
  pending: {
    stockItems: MyStockItem[];
    tools: PendingTool[];
    products: MyCheckoutProduct[];
  };
  held: {
    stockItems: MyStockItem[];
    tools: MyTool[];
    products: MyCheckoutProduct[];
  };
  history: CustodyHistoryRecord[];
}

const EMPTY: MyCustody = {
  pending: { stockItems: [], tools: [], products: [] },
  held: { stockItems: [], tools: [], products: [] },
  history: [],
};

function useMyCustody(): { data: MyCustody; loading: boolean } {
  const [data, setData] = useState<MyCustody>(EMPTY);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    axiosInstance
      .get<MyCustody>("/my-work/custody")
      .then((r) => setData(r.data ?? EMPTY))
      .catch(() => setData(EMPTY))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { data, loading };
}

/** Badge for a pending item's precise state. */
function pendingBadge(status: string) {
  if (status === "reserving")
    return <StatusBadge tone="neutral" label="hazırlanıyor" />;
  if (status === "delivering")
    return <StatusBadge tone="warning" label="teslim yolda" />;
  return <StatusBadge tone="warning" label="teslim alınacak" />;
}

const CLOSE_META: Record<
  NonNullable<CustodyHistoryRecord["closeAction"]>,
  { tone: "success" | "neutral"; label: string }
> = {
  returned: { tone: "success", label: "iade edildi" },
  consumed: { tone: "neutral", label: "tüketildi" },
  released: { tone: "neutral", label: "serbest bırakıldı" },
};

const TYPE_ICON = {
  stock_item: Package,
  tool: Wrench,
  product: Boxes,
} as const;

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleDateString() : "—";

/**
 * "Zimmetlerim" — the user's full custody picture: pending pickups, current
 * holdings and the immutable return/consume history (custody ledger).
 * Self-scoped endpoint; visible to every authenticated user.
 */
export const MyCustodyPage = () => {
  const { data, loading } = useMyCustody();
  const pendingCount =
    data.pending.stockItems.length +
    data.pending.tools.length +
    data.pending.products.length;
  const heldCount =
    data.held.stockItems.length +
    data.held.tools.length +
    data.held.products.length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Zimmetlerim</h1>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Teslim Alınacaklar ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="held">Üzerimdekiler ({heldCount})</TabsTrigger>
          <TabsTrigger value="history">
            Geçmiş ({data.history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 flex flex-col gap-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Yükleniyor…</p>
          ) : pendingCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Teslim almanız gereken bir şey yok.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {data.pending.stockItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="size-4 text-primary" />
                      Malzemeler ({data.pending.stockItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y text-sm">
                      {data.pending.stockItems.map((it) => (
                        <li key={it.id} className="flex items-center gap-2 py-2">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              <span className="font-mono text-primary">
                                {it.material?.code ?? "—"}
                              </span>{" "}
                              {it.material?.name ?? ""}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {it.lot?.lotNumber ?? "—"}
                              {it.warehouse?.code ? ` · ${it.warehouse.code}` : ""}
                              {it.stageName ? ` · ${it.stageName}` : ""}
                              {it.orderNumber ? ` · ${it.orderNumber}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-xs">
                            {it.quantity} {it.material?.unit ?? ""}
                          </span>
                          {pendingBadge(it.status)}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {data.pending.tools.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Wrench className="size-4 text-primary" />
                      Araçlar ({data.pending.tools.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y text-sm">
                      {data.pending.tools.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 py-2">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              <span className="font-mono text-primary">
                                {t.tool?.code ?? "—"}
                              </span>{" "}
                              {t.tool?.name ?? ""}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {t.stageName ? `Aşama: ${t.stageName}` : ""}
                              {t.reservedFrom
                                ? ` · ${fmt(t.reservedFrom)} → ${fmt(t.reservedTo)}`
                                : ""}
                            </span>
                          </span>
                          {pendingBadge(t.status)}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {data.pending.products.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Boxes className="size-4 text-primary" />
                      Girdi Ürünleri ({data.pending.products.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y text-sm">
                      {data.pending.products.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 py-2">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              <span className="font-mono text-primary">
                                {p.code}
                              </span>{" "}
                              {p.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {p.stageName ? `Girdi: ${p.stageName}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-xs">
                            {p.quantity} {p.unit ?? ""}
                          </span>
                          <StatusBadge tone="warning" label="teslim alınacak" />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="held" className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Yükleniyor…</p>
          ) : (
            <CheckoutCards
              stockItems={data.held.stockItems}
              tools={data.held.tools}
              products={data.held.products}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                İade / Tüketim Geçmişi ({data.history.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Yükleniyor…</p>
              ) : data.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Henüz kapanmış zimmet kaydınız yok — teslim aldıklarınız iade
                  edildiğinde veya tüketildiğinde burada listelenir.
                </p>
              ) : (
                <ul className="divide-y text-sm">
                  {data.history.map((r) => {
                    const Icon = TYPE_ICON[r.itemType] ?? Package;
                    const meta = r.closeAction
                      ? CLOSE_META[r.closeAction]
                      : null;
                    return (
                      <li key={r.id} className="flex items-center gap-3 py-2">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            <span className="font-mono text-primary">
                              {r.itemCode}
                            </span>{" "}
                            {r.itemName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {r.lotNumber ? `Lot ${r.lotNumber} · ` : ""}
                            {r.stageName ? `${r.stageName} · ` : ""}
                            {r.orderNumber ? `${r.orderNumber} · ` : ""}
                            {fmt(r.receivedAt)} → {fmt(r.closedAt)}
                            {r.closeAction === "returned" &&
                            r.returnedQuantity != null
                              ? ` · iade ${r.returnedQuantity}${r.unit ?? ""}` +
                                (r.usedQuantity
                                  ? `, kullanılan ${r.usedQuantity}${r.unit ?? ""}`
                                  : "")
                              : ""}
                          </span>
                        </span>
                        {r.quantity != null && (
                          <span className="shrink-0 font-mono text-xs">
                            {r.quantity} {r.unit ?? ""}
                          </span>
                        )}
                        {meta && (
                          <StatusBadge tone={meta.tone} label={meta.label} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
