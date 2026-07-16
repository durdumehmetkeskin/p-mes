import { useInvalidate, useList, useNotification } from "@refinedev/core";
import { useState } from "react";
import type { AxiosError } from "axios";

import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { axiosInstance } from "@/providers/axios";

const NONE = "__none__";

interface AdjustmentResult {
  systemQuantity: number;
  countedQuantity: number;
  delta: number;
  adjusted: boolean;
}

const REFRESH = ["materials", "inventory-balances", "inventory-transactions", "lots"];

export function StockCountForm({ onSuccess }: { onSuccess?: () => void }) {
  const { open } = useNotification();
  const invalidate = useInvalidate();

  const { result: materials } = useList({
    resource: "materials",
    pagination: { mode: "off" },
  });
  const { result: warehouses } = useList({
    resource: "warehouses",
    pagination: { mode: "off" },
  });
  const { result: racks } = useList({
    resource: "racks",
    pagination: { mode: "off" },
  });
  const { result: lots } = useList({
    resource: "lots",
    pagination: { mode: "off" },
  });

  const [materialId, setMaterialId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [rackId, setBinId] = useState<string | null>(null);
  const [lotId, setLotId] = useState<string | null>(null);
  const [countedQuantity, setCountedQuantity] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<AdjustmentResult | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const counted = Number(countedQuantity);
    if (!materialId || !warehouseId || countedQuantity === "" || counted < 0) {
      open?.({
        type: "error",
        message: "Material, warehouse and a non-negative counted quantity are required",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axiosInstance.post<AdjustmentResult>(
        "/inventory-transactions/adjust",
        {
          materialId,
          warehouseId,
          rackId: rackId ?? undefined,
          lotId: lotId ?? undefined,
          countedQuantity: counted,
          note: note || undefined,
        },
      );
      setLastResult(data);
      if (data.adjusted) {
        REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
      }
      open?.({
        type: "success",
        message: data.adjusted
          ? `Adjusted by ${data.delta > 0 ? "+" : ""}${data.delta}`
          : "No difference — count matches system",
        description: `System ${data.systemQuantity} → counted ${data.countedQuantity}`,
      });
      onSuccess?.();
    } catch (err) {
      const msg = (err as AxiosError<{ message?: string | string[] }>)?.response
        ?.data?.message;
      open?.({
        type: "error",
        message: "Stock count failed",
        description: Array.isArray(msg) ? msg.join(", ") : msg ?? "Error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Material</Label>
                <Select value={materialId} onValueChange={setMaterialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a material" />
                  </SelectTrigger>
                  <SelectContent>
                    {(materials?.data ?? []).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code} · {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {(warehouses?.data ?? []).map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.code} · {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Rack (optional)</Label>
                <Select
                  value={rackId ?? NONE}
                  onValueChange={(v) => setBinId(v === NONE ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rack" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {(racks?.data ?? []).map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.zone ? `${[l.zone.warehouse?.code, l.zone.code].filter(Boolean).join(" / ")} / ` : ""}
                        {l.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Lot (optional)</Label>
                <Select
                  value={lotId ?? NONE}
                  onValueChange={(v) => setLotId(v === NONE ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {(lots?.data ?? []).map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.material ? `${l.material.code} / ` : ""}
                        {l.lotNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="counted">Counted quantity</Label>
                <Input
                  id="counted"
                  type="number"
                  step="0.001"
                  value={countedQuantity}
                  onChange={(e) => setCountedQuantity(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="note">Note</Label>
                <Input
                  id="note"
                  placeholder="e.g. cycle count"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {lastResult && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                Last count — system {lastResult.systemQuantity}, counted{" "}
                {lastResult.countedQuantity},{" "}
                <span className="font-medium">
                  delta {lastResult.delta > 0 ? "+" : ""}
                  {lastResult.delta}
                </span>{" "}
                {lastResult.adjusted ? "(adjusted)" : "(no change)"}
              </div>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Counting..." : "Submit count"}
            </Button>
    </form>
  );
}

export const StockCount = () => (
  <ListView>
    <ListViewHeader title="Stock Count" />
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <StockCountForm />
      </CardContent>
    </Card>
  </ListView>
);
