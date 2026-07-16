import {
  useApiUrl,
  useCreate,
  useCustom,
  useDelete,
  useList,
  useUpdate,
} from "@refinedev/core";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Can } from "@/components/can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/use-permissions";
import { ConfirmDelete } from "@/pages/projects/workspace/confirm-delete";

interface RackRow {
  id: string;
  code: string;
  note: string | null;
}

interface StorageData {
  storage: { id: string; code: string; name: string };
  racks: RackRow[];
}

interface StoredProduct {
  id: string;
  code: string;
  name: string;
  quantity: number;
  storageRackId: string | null;
  productType: { name: string } | null;
  materialUnit: { name: string } | null;
}

type RackFormValues = { code: string; note?: string };

function RackDialog({
  storageId,
  record,
  open,
  onOpenChange,
  onSaved,
}: {
  storageId: string;
  record: RackRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(record);
  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RackFormValues>({
    defaultValues: {
      code: record?.code ?? "",
      note: record?.note ?? "",
    },
  });

  const submit = (values: RackFormValues) => {
    setSaving(true);
    const payload = {
      code: values.code.trim(),
      note: values.note?.trim() || undefined,
    };
    const opts = {
      onSuccess: () => {
        setSaving(false);
        onOpenChange(false);
        onSaved();
      },
      onError: () => setSaving(false),
    };
    if (isEdit && record) {
      update(
        { resource: "storage-racks", id: record.id, values: payload },
        opts,
      );
    } else {
      create(
        { resource: "storage-racks", values: { ...payload, storageId } },
        opts,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit rack" : "New rack"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rackCode">Code</Label>
            <Input
              id="rackCode"
              placeholder="R-01"
              {...register("code", { required: "Code is required" })}
            />
            {errors.code && (
              <span className="text-sm text-destructive">
                {String(errors.code.message)}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rackNote">Note</Label>
            <Textarea id="rackNote" {...register("note")} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The location's storage area — a location-owned child object (completely
 * separate from the inventory Warehouse entity) with its own racks, plus the
 * produced products currently shelved on them.
 */
export function StoragePanel({ locationId }: { locationId: string }) {
  const apiUrl = useApiUrl();
  const { has } = usePermissions();
  const { mutate: deleteRack } = useDelete();

  const { result, query } = useCustom<StorageData>({
    url: `${apiUrl}/locations/${locationId}/storage`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  // useCustom's result.data is `{}` (EMPTY_OBJECT) while loading — guard for
  // an actual payload before using it.
  const raw = result?.data as Partial<StorageData> | undefined;
  const storage = raw?.storage ? (raw as StorageData) : undefined;
  const racks = storage?.racks ?? [];

  const { result: products, query: productsQuery } = useList<StoredProduct>({
    resource: "products",
    filters: [
      {
        field: "storageId",
        operator: "eq",
        value: storage?.storage.id ?? "",
      },
    ],
    pagination: { mode: "off" },
    queryOptions: {
      enabled: Boolean(storage?.storage.id) && has("products:read"),
      retry: false,
    },
    errorNotification: false,
  });
  const productRows = products?.data ?? [];
  const productsOnRack = (rackId: string) =>
    productRows.filter((p) => p.storageRackId === rackId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RackRow | null>(null);
  const refresh = () => {
    void query.refetch();
    void productsQuery.refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Storage area</span>
          <div className="flex items-center gap-3">
            {storage && (
              <span className="text-sm font-normal text-muted-foreground">
                {storage.storage.code} · {racks.length} racks ·{" "}
                {productRows.length} products
              </span>
            )}
            <Can perm="storage-racks:create">
              <Button
                size="sm"
                variant="outline"
                disabled={!storage}
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add rack
              </Button>
            </Can>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : query.isError ? (
          <p className="text-sm text-muted-foreground">
            Could not load the storage area.
          </p>
        ) : racks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No racks in this location's storage area yet.
          </p>
        ) : (
          <div className="space-y-3">
            {racks.map((rack) => {
              const stored = productsOnRack(rack.id);
              return (
                <div key={rack.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-sm text-primary">
                        {rack.code}
                      </span>
                      {rack.note && (
                        <span className="ml-2 text-sm">{rack.note}</span>
                      )}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {stored.length} product{stored.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Can perm="storage-racks:update">
                        <Button
                          size="icon"
                          variant="outline"
                          title="Edit rack"
                          onClick={() => {
                            setEditing(rack);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Can>
                      <Can perm="storage-racks:delete">
                        <ConfirmDelete
                          title={`Delete rack ${rack.code}?`}
                          description="Products on it keep their record but lose the rack link."
                          onConfirm={() =>
                            deleteRack(
                              { resource: "storage-racks", id: rack.id },
                              { onSuccess: refresh },
                            )
                          }
                          trigger={
                            <Button
                              size="icon"
                              variant="outline"
                              title="Delete rack"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </Can>
                    </div>
                  </div>
                  {stored.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t pt-2">
                      {stored.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="min-w-0 truncate">
                            <span className="font-mono text-xs text-primary">
                              {p.code}
                            </span>{" "}
                            · {p.name}
                            {p.productType?.name && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({p.productType.name})
                              </span>
                            )}
                          </span>
                          <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground">
                            {p.quantity}
                            {p.materialUnit?.name
                              ? ` ${p.materialUnit.name}`
                              : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {dialogOpen && storage && (
        <RackDialog
          key={editing?.id ?? "new"}
          storageId={storage.storage.id}
          record={editing}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSaved={refresh}
        />
      )}
    </Card>
  );
}
