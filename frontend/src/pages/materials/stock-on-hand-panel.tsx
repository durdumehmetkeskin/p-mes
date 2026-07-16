import { useList } from "@refinedev/core";
import { useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

interface MaterialOption {
  id: string;
  code: string;
  name: string;
}
interface BalanceRow {
  id: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  quantity: number;
  material: { code: string; name: string } | null;
  warehouse: { code: string } | null;
  rack: { code: string } | null;
  lot: { lotNumber: string } | null;
}

/**
 * Stock on Hand, embedded in the Materials screen. A material filter scopes the
 * live inventory balances (Current / Reserved / Available) — read-only; stock
 * changes happen through the operations toolbar (Receive / Issue / …).
 */
export function StockOnHandPanel() {
  const [materialId, setMaterialId] = useState<string>(ALL);

  const { result: materials } = useList<MaterialOption>({
    resource: "materials",
    pagination: { mode: "off" },
  });

  const { result: balances } = useList<BalanceRow>({
    resource: "inventory-balances",
    pagination: { mode: "off" },
    filters:
      materialId === ALL
        ? []
        : [{ field: "materialId", operator: "eq", value: materialId }],
  });
  const rows = balances?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="stockMaterial">Material</Label>
        <Select value={materialId} onValueChange={setMaterialId}>
          <SelectTrigger id="stockMaterial">
            <SelectValue placeholder="All materials" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All materials</SelectItem>
            {(materials?.data ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.code} · {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-3 font-medium">Material</th>
              <th className="p-3 font-medium">Warehouse</th>
              <th className="p-3 font-medium">Rack</th>
              <th className="p-3 font-medium">Lot</th>
              <th className="p-3 font-medium text-right">Current</th>
              <th className="p-3 font-medium text-right">Reserved</th>
              <th className="p-3 font-medium text-right">Available</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="p-3">
                    {b.material
                      ? `${b.material.code} · ${b.material.name}`
                      : "—"}
                  </td>
                  <td className="p-3">{b.warehouse?.code ?? "—"}</td>
                  <td className="p-3">{b.rack?.code ?? "—"}</td>
                  <td className="p-3">{b.lot?.lotNumber ?? "—"}</td>
                  <td className="p-3 text-right">
                    {b.currentStock ?? b.quantity}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">
                    {b.reservedStock ?? 0}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {b.availableStock ?? b.quantity}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-muted-foreground"
                >
                  No stock records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
