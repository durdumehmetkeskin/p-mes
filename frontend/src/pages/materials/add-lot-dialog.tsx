import { useCreate, useInvalidate, useList } from "@refinedev/core";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

const NO_RACK = "__none__";

interface RackOption {
  id: string;
  code: string;
  zone?: { code?: string; warehouse?: { code?: string } | null } | null;
}

/**
 * Creates a new lot for a specific material, straight from its detail screen —
 * so a material that has no lots yet can get one without leaving the page.
 */
export function AddLotDialog({
  material,
}: {
  material: { id: string; code: string };
}) {
  const { mutate } = useCreate();
  const invalidate = useInvalidate();
  const { result: racks } = useList<RackOption>({
    resource: "racks",
    pagination: { mode: "off" },
  });

  const [open, setOpen] = useState(false);
  const [rackId, setBinId] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !submitting;

  const reset = () => {
    setBinId(null);
    setExpiryDate("");
    setSubmitting(false);
  };

  const submit = () => {
    setSubmitting(true);
    mutate(
      {
        resource: "lots",
        values: {
          materialId: material.id,
          rackId: rackId ?? undefined,
          expiryDate: expiryDate || undefined,
        },
      },
      {
        onSuccess: () => {
          invalidate({ resource: "lots", invalidates: ["list"] });
          setOpen(false);
          reset();
        },
        onError: () => setSubmitting(false),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          Add lot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New lot · {material.code}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lotExpiry">Expiry date (SKT)</Label>
            <Input
              id="lotExpiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Rack</Label>
            <Select
              value={rackId ?? NO_RACK}
              onValueChange={(v) => setBinId(v === NO_RACK ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rack" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_RACK}>— None —</SelectItem>
                {(racks?.data ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.zone ? `${[l.zone.warehouse?.code, l.zone.code].filter(Boolean).join(" / ")} / ` : ""}
                    {l.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button disabled={!canSubmit} onClick={submit}>
              {submitting ? "Creating..." : "Create lot"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
