import { useInvalidate, useList, useNotification } from "@refinedev/core";
import { useState } from "react";
import type { AxiosError } from "axios";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const REFRESH = ["stock-items", "inventory-balances", "lots"];

interface RackOpt {
  id: string;
  code?: string;
  zone?: {
    warehouseId?: string;
    code?: string;
    warehouse?: { code?: string } | null;
  } | null;
}

/**
 * Warehouse re-receives a returned stock item: weigh (quantity) + re-shelve
 * (rackId → the item's warehouse). Shared by the lot page + the warehouse hub.
 */
export function ReceiveReturnDialog({
  item,
  onDone,
}: {
  item: { id: string; quantity: number; warehouseId: string };
  onDone?: () => void;
}) {
  const { open: notify } = useNotification();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [rackId, setRackId] = useState("");
  const [busy, setBusy] = useState(false);

  const { result: racks } = useList<RackOpt>({
    resource: "racks",
    pagination: { mode: "off" },
    queryOptions: { enabled: open },
  });
  const rackOpts = (racks?.data ?? []).filter(
    (r) => r.zone?.warehouseId === item.warehouseId,
  );

  const submit = async () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0 || qty > item.quantity) {
      notify?.({ type: "error", message: `Enter a quantity between 1 and ${item.quantity}` });
      return;
    }
    if (!rackId) {
      notify?.({ type: "error", message: "Select a rack" });
      return;
    }
    setBusy(true);
    try {
      await axiosInstance.post(`/stock-items/${item.id}/receive-return`, {
        quantity: qty,
        rackId,
      });
      REFRESH.forEach((r) => invalidate({ resource: r, invalidates: ["list"] }));
      notify?.({ type: "success", message: "Returned to stock" });
      setOpen(false);
      setQuantity("");
      setRackId("");
      onDone?.();
    } catch (err) {
      const msg = (err as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
      notify?.({ type: "error", message: Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          Receive return
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive return ({item.quantity} delivered)</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Weighed quantity (max {item.quantity})</Label>
            <Input type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            {(() => {
              const q = Number(quantity);
              if (!q || q <= 0 || q > item.quantity) return null;
              return (
                <span className="text-xs text-muted-foreground">
                  Used at stage: {Math.round((item.quantity - q) * 1000) / 1000}
                </span>
              );
            })()}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Rack</Label>
            <Select value={rackId} onValueChange={setRackId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a rack" />
              </SelectTrigger>
              <SelectContent>
                {rackOpts.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.zone ? `${[r.zone.warehouse?.code, r.zone.code].filter(Boolean).join(" / ")} / ` : ""}
                    {r.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={() => void submit()}>
            {busy ? "Saving…" : "Accept return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
