import {
  useCreate,
  useDelete,
  useInvalidate,
  useList,
  useNotification,
  useUpdate,
} from "@refinedev/core";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageCheck,
  PackagePlus,
  Pencil,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { axiosInstance } from "@/providers/axios";
import { usePermissions } from "@/hooks/use-permissions";

interface MaterialOption {
  id: string;
  code: string;
  name: string;
  materialUnit: { id: string; name: string } | null;
}
interface RequirementRow {
  id: string;
  orderId: string;
  materialId: string;
  requiredQuantity: number;
  note: string | null;
  material: MaterialOption | null;
  /** Pending warehouse preparation (status=reserving). */
  reservingQuantity: number;
  /** Confirmed for the order (reserved/delivering/delivered). */
  reservedQuantity: number;
  /** Of that, currently being handed over by the warehouse. */
  deliveringQuantity: number;
  /** Of that, received by the order. */
  deliveredQuantity: number;
  /** The order's project freely-available stock of the material. */
  availableQuantity: number;
}

type FormValues = { materialId: string; requiredQuantity: number; note: string };

function RequirementDialog({
  record,
  orderId,
  materials,
  trigger,
}: {
  record?: RequirementRow;
  orderId: string;
  materials: MaterialOption[];
  trigger: React.ReactNode;
}) {
  const isEdit = Boolean(record);
  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);

  const defaults = (): FormValues => ({
    materialId: record?.materialId ?? "",
    requiredQuantity: record?.requiredQuantity ?? 0,
    note: record?.note ?? "",
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: defaults() });

  const submit = (values: FormValues) =>
    new Promise<void>((resolve) => {
      const opts = {
        onSuccess: () => {
          invalidate({
            resource: "order-material-requirements",
            invalidates: ["list"],
          });
          setOpen(false);
          resolve();
        },
        onError: () => resolve(),
      };
      if (isEdit && record) {
        update(
          {
            resource: "order-material-requirements",
            id: record.id,
            values: {
              requiredQuantity: values.requiredQuantity,
              note: values.note || null,
            },
          },
          opts,
        );
      } else {
        create(
          {
            resource: "order-material-requirements",
            values: {
              orderId,
              materialId: values.materialId,
              requiredQuantity: values.requiredQuantity,
              note: values.note || undefined,
            },
          },
          opts,
        );
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset(defaults());
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit required material" : "Add required material"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-5">
          <div className="flex flex-col gap-2">
            <Label>Material</Label>
            {isEdit ? (
              <Input
                value={
                  record?.material
                    ? `${record.material.code} · ${record.material.name}`
                    : ""
                }
                disabled
              />
            ) : (
              <Controller
                name="materialId"
                control={control}
                rules={{ required: "Material is required" }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.code} · {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.materialId && (
              <span className="text-sm text-destructive">
                {errors.materialId.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="requiredQuantity">Required quantity</Label>
            <Input
              id="requiredQuantity"
              type="number"
              step="0.001"
              min="0"
              {...register("requiredQuantity", { valueAsNumber: true, min: 0 })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Note</Label>
            <Input id="note" {...register("note")} />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Reservation state of a requirement row, derived from the server totals. */
function requirementState(r: RequirementRow) {
  const required = Number(r.requiredQuantity ?? 0);
  const reserved = Number(r.reservedQuantity ?? 0);
  const reserving = Number(r.reservingQuantity ?? 0);
  const delivering = Number(r.deliveringQuantity ?? 0);
  const delivered = Number(r.deliveredQuantity ?? 0);
  const available = Number(r.availableQuantity ?? 0);
  const covered = reserved + reserving;
  const remaining = Math.max(0, Math.round((required - covered) * 1000) / 1000);
  return {
    required,
    reserved,
    reserving,
    delivering,
    delivered,
    available,
    remaining,
    fullyReserved: required > 0 && reserved >= required,
    pending: reserving > 0,
    shortage: remaining > 0 && available < remaining,
  };
}

function StatusCell({ r }: { r: RequirementRow }) {
  const s = requirementState(r);
  if (s.required <= 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  // Handover progress mirrors the warehouse flow:
  // reserving → reserved → delivering → delivered.
  if (s.delivered >= s.required) {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <PackageCheck className="h-4 w-4" />
        <span className="text-xs">delivered</span>
      </span>
    );
  }
  if (s.shortage) {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-xs">insufficient stock</span>
      </span>
    );
  }
  if (s.delivering > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-info">
        <Truck className="h-4 w-4" />
        <span className="text-xs">delivering</span>
      </span>
    );
  }
  if (s.pending) {
    return (
      <span className="inline-flex items-center gap-1 text-warning">
        <Clock className="h-4 w-4" />
        <span className="text-xs">reserving</span>
      </span>
    );
  }
  if (s.fullyReserved) {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs">reserved</span>
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">not reserved</span>;
}

export const OrderRequiredMaterials = ({
  orderId,
  canManage = false,
}: {
  orderId: string;
  /** Editing the requirements list is reserved to admins and the project's
   *  manager (backend mirrors with a 403); members are read-only. */
  canManage?: boolean;
}) => {
  const { mutate: remove } = useDelete();
  const invalidate = useInvalidate();
  const { open } = useNotification();
  const [reservingId, setReservingId] = useState<string | null>(null);

  const { result } = useList<RequirementRow>({
    resource: "order-material-requirements",
    filters: [{ field: "orderId", operator: "eq", value: orderId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(orderId) },
  });
  const rows = result?.data ?? [];

  // Material picker data — needs the materials:read key; a plain member
  // would just collect 403s in the console, so don't even ask without it.
  const { has } = usePermissions();
  const { result: materialsResult } = useList<MaterialOption>({
    resource: "materials",
    pagination: { mode: "off" },
    queryOptions: { enabled: canManage && has("materials:read"), retry: false },
    errorNotification: false,
  });
  const allMaterials = materialsResult?.data ?? [];
  // Only offer materials not already in the list.
  const takenIds = new Set(rows.map((r) => r.materialId));
  const availableMaterials = allMaterials.filter((m) => !takenIds.has(m.id));

  const refresh = () => {
    invalidate({
      resource: "order-material-requirements",
      invalidates: ["list"],
    });
    invalidate({ resource: "stock-items", invalidates: ["list"] });
  };

  const onDelete = (id: string) =>
    remove(
      { resource: "order-material-requirements", id },
      { onSuccess: refresh },
    );

  // Reserve what the requirement still needs, capped at the available stock
  // (partial reservation is allowed when stock runs short).
  const onReserve = async (r: RequirementRow) => {
    const s = requirementState(r);
    const quantity = Math.min(s.remaining, s.available);
    if (quantity <= 0) return;
    setReservingId(r.id);
    try {
      await axiosInstance.post(
        `/order-material-requirements/${r.id}/reserve`,
        { quantity },
      );
      open?.({
        type: "success",
        message: s.shortage
          ? `Reserved ${quantity} — stock is short of the remaining need`
          : "Reservation requested",
      });
      refresh();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Reservation failed";
      open?.({ type: "error", message: msg });
    } finally {
      setReservingId(null);
    }
  };

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) =>
        (a.material?.code ?? "").localeCompare(b.material?.code ?? ""),
      ),
    [rows],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Required materials</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal text-muted-foreground">
              {rows.length} total
            </span>
            {canManage && (
              <RequirementDialog
                orderId={orderId}
                materials={availableMaterials}
                trigger={
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1 h-4 w-4" />
                    Add material
                  </Button>
                }
              />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Material</th>
                <th className="pb-2 font-medium text-right">Required</th>
                <th className="pb-2 font-medium text-right">Reserved</th>
                <th className="pb-2 font-medium text-right">Available</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Note</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const unit = r.material?.materialUnit?.name ?? "";
                const s = requirementState(r);
                const canReserve = s.remaining > 0 && s.available > 0;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">
                      <span className="font-mono text-primary">
                        {r.material?.code ?? "—"}
                      </span>{" "}
                      {r.material?.name ?? ""}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {s.required} {unit}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {s.reserved}
                      {s.reserving > 0 ? ` (+${s.reserving})` : ""} {unit}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {s.available} {unit}
                    </td>
                    <td className="py-2">
                      <StatusCell r={r} />
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {r.note ?? "—"}
                    </td>
                    <td className="py-2">
                      <div className="flex justify-end gap-2">
                        {canReserve && (
                          <Button
                            size="sm"
                            variant={s.shortage ? "destructive" : "outline"}
                            disabled={reservingId === r.id}
                            onClick={() => void onReserve(r)}
                            title={
                              s.shortage
                                ? `Only ${s.available} ${unit} available — reserves what exists`
                                : `Reserve ${s.remaining} ${unit}`
                            }
                          >
                            <PackagePlus className="mr-1 h-4 w-4" />
                            {reservingId === r.id
                              ? "Reserving..."
                              : s.shortage
                                ? `Reserve ${Math.min(s.remaining, s.available)}`
                                : "Reserve"}
                          </Button>
                        )}
                        {canManage && (
                          <RequirementDialog
                            record={r}
                            orderId={orderId}
                            materials={availableMaterials}
                            trigger={
                              <Button size="icon" variant="outline">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                        )}
                        {canManage && (
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => onDelete(r.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">
            No required materials yet. Add the materials this order needs and
            reserve stock for them.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
