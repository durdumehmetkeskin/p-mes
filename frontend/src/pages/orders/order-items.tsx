import { useCreate, useDelete, useInvalidate, useList, useUpdate } from "@refinedev/core";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  QrCode,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useForm } from "react-hook-form";

import { Can } from "@/components/can";
import { QrCodeDialog } from "@/components/qr/qr-code-dialog";
import { ConfirmDelete } from "@/pages/projects/workspace/confirm-delete";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OrderItemFormFields } from "./order-item-form-fields";
import { OrderProcesses } from "./order-processes";

type FormValues = Record<string, unknown>;

interface OrderItemRow {
  id: string;
  sequence: number;
  name: string;
  description: string | null;
  status: string | null;
}

function clean(values: FormValues): FormValues {
  const p = { ...values };
  if (!p.description) delete p.description;
  return p;
}

function OrderItemDialog({
  orderId,
  item,
  nextSequence,
  trigger,
}: {
  orderId: string;
  item?: OrderItemRow;
  nextSequence: number;
  trigger: React.ReactNode;
}) {
  const isEdit = Boolean(item);
  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);

  const defaults: FormValues = item
    ? {
        sequence: item.sequence,
        name: item.name,
        description: item.description ?? "",
      }
    : { sequence: nextSequence, name: "", description: "" };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: defaults });

  const done = () => {
    invalidate({ resource: "order-items", invalidates: ["list"] });
    setOpen(false);
  };

  const submit = (values: FormValues) =>
    new Promise<void>((resolve) => {
      const payload = clean(values);
      if (isEdit && item) {
        update(
          { resource: "order-items", id: item.id, values: payload },
          { onSuccess: () => (done(), resolve()), onError: () => resolve() },
        );
      } else {
        create(
          { resource: "order-items", values: { ...payload, orderId } },
          {
            onSuccess: () => {
              done();
              reset({
                sequence: nextSequence + 1,
                name: "",
                description: "",
              });
              resolve();
            },
            onError: () => resolve(),
          },
        );
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset(defaults);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "New item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-6">
          <OrderItemFormFields
            register={register as unknown as UseFormRegister<FormValues>}
            errors={errors as FieldErrors<FormValues>}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OrderItems({
  orderId,
  projectId,
  orderNumber,
}: {
  orderId: string;
  projectId: string;
  /** For the per-item QR label/file name (`<orderNumber>-<sequence>`). */
  orderNumber?: string;
}) {
  const invalidate = useInvalidate();
  const { mutate: removeItem } = useDelete();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { result } = useList<OrderItemRow>({
    resource: "order-items",
    filters: [{ field: "orderId", operator: "eq", value: orderId }],
    sorters: [{ field: "sequence", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(orderId) },
  });
  const items = result?.data ?? [];
  const nextSequence =
    items.reduce((max, i) => Math.max(max, i.sequence), 0) + 1;

  const onDelete = (id: string) =>
    removeItem(
      { resource: "order-items", id },
      {
        onSuccess: () => {
          if (expandedId === id) setExpandedId(null);
          invalidate({ resource: "order-items", invalidates: ["list"] });
        },
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Items ({items.length})</span>
          <Can perm="order-items:create">
            <OrderItemDialog
              orderId={orderId}
              nextSequence={nextSequence}
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 h-4 w-4" />
                  New item
                </Button>
              }
            />
          </Can>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="divide-y rounded-md border">
            {items.map((item) => {
              const expanded = expandedId === item.id;
              return (
                <div key={item.id}>
                  {/* Clickable header row — toggles the processes panel. */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setExpandedId(expanded ? null : item.id)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedId(expanded ? null : item.id);
                      }
                    }}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="font-medium">
                      #{item.sequence} · {item.name}
                    </span>
                    {item.status && (
                      <StatusBadge
                        label={String(item.status).replace(/_/g, " ")}
                      />
                    )}
                    <div
                      className="ml-auto flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <QrCodeDialog
                        resource="order-items"
                        id={item.id}
                        code={
                          orderNumber
                            ? `${orderNumber}-${item.sequence}`
                            : `#${item.sequence}`
                        }
                        title={item.name}
                        trigger={
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Item QR code"
                            title="QR kodu"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Can perm="order-items:update">
                        <OrderItemDialog
                          orderId={orderId}
                          item={item}
                          nextSequence={nextSequence}
                          trigger={
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Edit item"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </Can>
                      <Can perm="order-items:delete">
                        <ConfirmDelete
                          title="Delete item?"
                          description="This item and all its processes will be removed."
                          onConfirm={() => onDelete(item.id)}
                          trigger={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              aria-label="Delete item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </Can>
                    </div>
                  </div>

                  {/* Expanded: the item's processes. */}
                  {expanded && (
                    <div className="border-t bg-muted/20 p-3">
                      {item.description && (
                        <p className="mb-3 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <OrderProcesses
                        orderItemId={item.id}
                        orderId={orderId}
                        projectId={projectId}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No items yet. Add an item to start planning its processes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
