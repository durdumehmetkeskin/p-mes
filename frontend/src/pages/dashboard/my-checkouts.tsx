import { Boxes, Package, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { axiosInstance } from "@/providers/axios";

export interface MyStockItem {
  id: string;
  quantity: number;
  status: string;
  receivedAt: string | null;
  material: { code: string; name: string; unit: string | null } | null;
  lot: { lotNumber: string } | null;
  warehouse: { code: string } | null;
  orderNumber: string | null;
  stageName: string | null;
}

export interface MyTool {
  id: string;
  status: string;
  receivedAt: string | null;
  tool: { id: string; code: string; name: string } | null;
  stageName: string | null;
}

export interface MyCheckoutProduct {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string | null;
  receivedAt: string | null;
  stageName: string | null;
}

/**
 * Everything currently checked out (zimmet) to the current user. Self-scoped
 * endpoint — safe for every role, admin included.
 */
export function useMyCheckouts(): {
  stockItems: MyStockItem[];
  tools: MyTool[];
  products: MyCheckoutProduct[];
} {
  const [stockItems, setStockItems] = useState<MyStockItem[]>([]);
  const [tools, setTools] = useState<MyTool[]>([]);
  const [products, setProducts] = useState<MyCheckoutProduct[]>([]);
  useEffect(() => {
    let mounted = true;
    axiosInstance
      .get<{
        stockItems: MyStockItem[];
        tools: MyTool[];
        products?: MyCheckoutProduct[];
      }>("/my-work/checkouts")
      .then((r) => {
        if (!mounted) return;
        setStockItems(r.data.stockItems ?? []);
        setTools(r.data.tools ?? []);
        setProducts(r.data.products ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setStockItems([]);
        setTools([]);
        setProducts([]);
      });
    return () => {
      mounted = false;
    };
  }, []);
  return { stockItems, tools, products };
}

/** The "Üzerimdeki Malzemeler / Araçlar" card pair (shared by both dashboards). */
export function CheckoutCards({
  stockItems,
  tools,
  products = [],
}: {
  stockItems: MyStockItem[];
  tools: MyTool[];
  products?: MyCheckoutProduct[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4 text-primary" />
            Üzerimdeki Malzemeler ({stockItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Üzerinize teslim edilmiş malzeme yok.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {stockItems.map((it) => (
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
                      {it.stageName ? ` · ${it.stageName}` : ""}
                      {it.orderNumber ? ` · ${it.orderNumber}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs">
                    {it.quantity} {it.material?.unit ?? ""}
                  </span>
                  <StatusBadge
                    tone={it.status === "returning" ? "warning" : "info"}
                    label={it.status === "returning" ? "iade yolda" : "üzerimde"}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="size-4 text-primary" />
            Üzerimdeki Araçlar ({tools.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tools.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Üzerinize teslim edilmiş araç yok.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {tools.map((t) => (
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
                      {t.receivedAt
                        ? ` · ${new Date(t.receivedAt).toLocaleDateString()}`
                        : ""}
                    </span>
                  </span>
                  <StatusBadge
                    tone={t.status === "returning" ? "warning" : "info"}
                    label={t.status === "returning" ? "iade yolda" : "üzerimde"}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Input products in custody — only shown when there are any. */}
      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="size-4 text-primary" />
              Üzerimdeki Ürünler ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      <span className="font-mono text-primary">{p.code}</span>{" "}
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.stageName ? `Girdi: ${p.stageName}` : ""}
                      {p.receivedAt
                        ? ` · ${new Date(p.receivedAt).toLocaleDateString()}`
                        : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs">
                    {p.quantity} {p.unit ?? ""}
                  </span>
                  <StatusBadge tone="info" label="üzerimde" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
