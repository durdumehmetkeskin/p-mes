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

interface SlotState {
  warehouseId: string;
  rackId: string | null;
  lotId: string | null;
}

const emptySlot: SlotState = { warehouseId: "", rackId: null, lotId: null };

const REFRESH = ["materials", "inventory-balances", "inventory-transactions", "lots"];

export function GoodsTransferForm({ onSuccess }: { onSuccess?: () => void }) {
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
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState<SlotState>({ ...emptySlot });
  const [target, setTarget] = useState<SlotState>({ ...emptySlot });
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setMaterialId("");
    setQuantity("");
    setNote("");
    setSource({ ...emptySlot });
    setTarget({ ...emptySlot });
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!materialId || !source.warehouseId || !target.warehouseId || !qty || qty <= 0) {
      open?.({
        type: "error",
        message: "Material, source/target warehouse and a positive quantity are required",
      });
      return;
    }

    setSubmitting(true);
    try {
      await axiosInstance.post("/inventory-transactions/transfer", {
        materialId,
        quantity: qty,
        note: note || undefined,
        sourceWarehouseId: source.warehouseId,
        sourceRackId: source.rackId ?? undefined,
        sourceLotId: source.lotId ?? undefined,
        targetWarehouseId: target.warehouseId,
        targetRackId: target.rackId ?? undefined,
        targetLotId: target.lotId ?? undefined,
      });
      REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
      open?.({
        type: "success",
        message: "Stock transferred",
        description: "Source debited, target credited.",
      });
      reset();
      onSuccess?.();
    } catch (err) {
      const msg = (err as AxiosError<{ message?: string | string[] }>)?.response
        ?.data?.message;
      open?.({
        type: "error",
        message: "Transfer failed",
        description: Array.isArray(msg) ? msg.join(", ") : msg ?? "Error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const slotFields = (
    title: string,
    slot: SlotState,
    set: (s: SlotState) => void,
  ) => (
    <fieldset className="rounded-md border p-4 space-y-4">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <div className="flex flex-col gap-2">
        <Label>Warehouse</Label>
        <Select
          value={slot.warehouseId}
          onValueChange={(v) => set({ ...slot, warehouseId: v })}
        >
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
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Rack (optional)</Label>
          <Select
            value={slot.rackId ?? NONE}
            onValueChange={(v) =>
              set({ ...slot, rackId: v === NONE ? null : v })
            }
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
            value={slot.lotId ?? NONE}
            onValueChange={(v) => set({ ...slot, lotId: v === NONE ? null : v })}
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
    </fieldset>
  );

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
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>

            {slotFields("From (source)", source, setSource)}
            {slotFields("To (target)", target, setTarget)}

            <div className="flex flex-col gap-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? "Transferring..." : "Transfer stock"}
            </Button>
    </form>
  );
}

export const GoodsTransfer = () => (
  <ListView>
    <ListViewHeader title="Goods Transfer" />
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <GoodsTransferForm />
      </CardContent>
    </Card>
  </ListView>
);
