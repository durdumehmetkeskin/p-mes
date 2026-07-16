import {
  useApiUrl,
  useCreate,
  useCustomMutation,
  useDelete,
  useInvalidate,
  useList,
} from "@refinedev/core";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";

import { Can } from "@/components/can";
import { LookupSelect } from "@/components/lookup-select";
import { LocationRackFields } from "@/pages/products/product-form-fields";
import { axiosInstance } from "@/providers/axios";
import { Download, Eye, Link2 } from "lucide-react";
import { useEffect } from "react";
import { FileViewerDialog, isViewable } from "./file-viewer-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/use-permissions";

interface StageProduct {
  id: string;
  code: string;
  name: string;
  quantity: number;
  stageId?: string | null;
  stage?: { id: string; name: string } | null;
  productType: { name: string } | null;
  materialUnit: { name: string } | null;
}

type FormValues = Record<string, unknown>;

/**
 * Dialog for recording what a stage produced (an intermediate product, a
 * finished product, a mold, ...). Posts to /products with the stageId; the
 * backend derives the process/order origin from the stage. Also opened
 * automatically right after a stage is marked completed (optional, dismissable).
 */
export function StageProductDialog({
  stageId,
  open,
  onOpenChange,
  prompted = false,
}: {
  stageId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** True when auto-opened by stage completion (shows the explanatory hint). */
  prompted?: boolean;
}) {
  const invalidate = useInvalidate();
  const { mutate: createProduct } = useCreate();
  const [saving, setSaving] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { quantity: 1 } });

  const submit = (values: FormValues) => {
    const payload: FormValues = { ...values, stageId };
    if (
      typeof payload.quantity === "number" &&
      Number.isNaN(payload.quantity)
    ) {
      delete payload.quantity;
    }
    // UI-only cascade field — the storage rack already pins the location.
    delete payload.locationId;
    if (!payload.storageRackId) delete payload.storageRackId;
    setSaving(true);
    createProduct(
      { resource: "products", values: payload },
      {
        onSuccess: () => {
          invalidate({ resource: "products", invalidates: ["list"] });
          reset({ quantity: 1 });
          setSaving(false);
          onOpenChange(false);
        },
        onError: () => setSaving(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record produced product</DialogTitle>
          {prompted && (
            <DialogDescription>
              Record what this stage produced — optional, you can also add it
              later from the stage card.
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="stageProductName">Name</Label>
            <Input
              id="stageProductName"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <span className="text-sm text-destructive">
                {String(errors.name.message)}
              </span>
            )}
          </div>

          <LookupSelect
            control={control as unknown as Control<FormValues>}
            name="productTypeId"
            label="Product type"
            resource="product-types"
            dialogTitle="New product type"
            placeholder="Select a type"
            namePlaceholder="e.g. Mold"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="stageProductQty">Quantity</Label>
              <Input
                id="stageProductQty"
                type="number"
                step="0.001"
                min="0"
                {...register("quantity", {
                  required: "Quantity is required",
                  valueAsNumber: true,
                  min: 0,
                })}
              />
              {errors.quantity && (
                <span className="text-sm text-destructive">
                  {String(errors.quantity.message)}
                </span>
              )}
            </div>

            <LookupSelect
              control={control as unknown as Control<FormValues>}
              name="materialUnitId"
              label="Unit"
              resource="material-units"
              dialogTitle="New unit"
              placeholder="Select unit"
              namePlaceholder="e.g. piece"
              minNameLength={1}
              unitNotation
            />
          </div>

          {/* Where the product is stored (a rack in a location's storage). */}
          <LocationRackFields control={control as unknown as Parameters<typeof LocationRackFields>[0]["control"]} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="stageProductNote">Note</Label>
            <Textarea id="stageProductNote" {...register("note")} />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {prompted ? "Skip" : "Cancel"}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Sentinel for the input-product picker.
const NONE = "__none__";

/**
 * Products used as this stage's INPUT (e.g. an intermediate product from a
 * previous stage). A stage's inputs can be products, documents (stage_input
 * attachments), or both. Adding an input "consumes" an unconsumed product;
 * removing releases it. Products produced by this stage's PREDECESSOR stages
 * (its incoming DAG links) are listed first — the natural output → input flow.
 */
export function StageInputProductsPanel({
  stageId,
  orderId,
  predecessorStageIds = [],
  ioPredecessorStageIds = [],
}: {
  stageId: string;
  orderId?: string;
  /** Producer stages wired into this one on the workflow graph (any kind). */
  predecessorStageIds?: string[];
  /** Stages whose OUT port is connected to this stage's IN port — their
   *  outputs flow in automatically. */
  ioPredecessorStageIds?: string[];
}) {
  const apiUrl = useApiUrl();
  const { has } = usePermissions();
  const invalidate = useInvalidate();
  const { mutate: customMutate } = useCustomMutation();

  const { result, query } = useList<StageProduct>({
    resource: "products",
    filters: [{ field: "consumedByStageId", operator: "eq", value: stageId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: has("products:read"), retry: false },
    errorNotification: false,
  });
  const items = result?.data ?? [];

  // Outputs flowing in via io arrows (OUT → IN connections on the canvas):
  // the connected predecessors' products, unless consumed by another stage.
  const ioPredSet = new Set(ioPredecessorStageIds);
  const { result: orderProducts } = useList<
    StageProduct & { consumedByStageId?: string | null }
  >({
    resource: "products",
    filters: [{ field: "orderId", operator: "eq", value: orderId ?? "" }],
    pagination: { mode: "off" },
    queryOptions: {
      enabled:
        Boolean(orderId) &&
        ioPredecessorStageIds.length > 0 &&
        has("products:read"),
      retry: false,
    },
    errorNotification: false,
  });
  const directIds = new Set(items.map((p) => p.id));
  const inherited = (orderProducts?.data ?? []).filter(
    (p) =>
      p.stageId &&
      ioPredSet.has(p.stageId) &&
      !directIds.has(p.id) &&
      (!p.consumedByStageId || p.consumedByStageId === stageId),
  );

  // Candidates: products not yet consumed anywhere (the backend also rejects
  // using a product as input of the stage that produced it).
  const [pickerOpen, setPickerOpen] = useState(false);
  const { result: candidates } = useList<StageProduct>({
    resource: "products",
    filters: [{ field: "unconsumed", operator: "eq", value: "true" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: pickerOpen && has("products:read"), retry: false },
    errorNotification: false,
  });
  const predecessorSet = new Set(predecessorStageIds);
  const candidateRows = (candidates?.data ?? [])
    .filter((p) => p.stageId !== stageId)
    .sort((a, b) => {
      // Predecessor outputs first — their output IS this stage's input.
      const ap = a.stageId && predecessorSet.has(a.stageId) ? 0 : 1;
      const bp = b.stageId && predecessorSet.has(b.stageId) ? 0 : 1;
      return ap - bp || a.code.localeCompare(b.code);
    });
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () =>
    invalidate({ resource: "products", invalidates: ["list"] });

  const addInput = () => {
    if (!selected) return;
    setSaving(true);
    customMutate(
      {
        url: `${apiUrl}/products/${selected}/consume`,
        method: "post",
        values: { stageId },
      },
      {
        onSuccess: () => {
          setSaving(false);
          setSelected(null);
          setPickerOpen(false);
          refresh();
        },
        onError: () => setSaving(false),
      },
    );
  };

  const removeInput = (productId: string) =>
    customMutate(
      {
        url: `${apiUrl}/products/${productId}/consume`,
        method: "delete",
        values: {},
      },
      { onSuccess: refresh },
    );

  if (!has("products:read")) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Input products</span>
        {has("products:consume") && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPickerOpen((o) => !o)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add input
          </Button>
        )}
      </div>

      {pickerOpen && (
        <div className="flex items-center gap-2">
          <Select
            value={selected ?? NONE}
            onValueChange={(v) => setSelected(v === NONE ? null : v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— Select a product —</SelectItem>
              {candidateRows.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code} · {p.name}
                  {p.stage
                    ? predecessorSet.has(p.stage.id)
                      ? ` — output of "${p.stage.name}" ⭐`
                      : ` — from "${p.stage.name}"`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!selected || saving} onClick={addInput}>
            {saving ? "Adding..." : "Add"}
          </Button>
        </div>
      )}

      {/* Outputs flowing in via OUT → IN canvas connections (read-only). */}
      {inherited.length > 0 && (
        <ul className="space-y-1">
          {inherited.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded border border-dashed border-teal-500/40 p-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate">
                  <span className="font-mono text-xs text-primary">
                    {p.code}
                  </span>{" "}
                  · {p.name}
                </div>
                <div className="flex items-center gap-1 text-xs text-teal-300">
                  <Link2 className="h-3 w-3" />
                  output of "{p.stage?.name ?? "connected stage"}"
                </div>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {p.quantity}
                {p.materialUnit?.name ? ` ${p.materialUnit.name}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {query.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : items.length === 0 && inherited.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No input products for this stage.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded border p-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">
                  <span className="font-mono text-xs text-primary">
                    {p.code}
                  </span>{" "}
                  · {p.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.productType?.name ?? "—"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {p.quantity}
                  {p.materialUnit?.name ? ` ${p.materialUnit.name}` : ""}
                </span>
                {has("products:consume") && (
                  <Button
                    size="icon"
                    variant="outline"
                    title="Remove input"
                    onClick={() => removeInput(p.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface InheritedDoc {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  stageName: string;
}

/**
 * OUTPUT documents of stages whose OUT port is connected to this stage's IN
 * port — they flow in as this stage's input documents (read-only; download
 * only, the source stage owns them).
 */
export function InheritedInputDocs({
  stages,
}: {
  /** io-predecessor stages: id + display name. */
  stages: Array<{ id: string; name: string }>;
}) {
  const [docs, setDocs] = useState<InheritedDoc[]>([]);
  const [viewing, setViewing] = useState<InheritedDoc | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (stages.length === 0) {
      setDocs([]);
      return;
    }
    void Promise.all(
      stages.map(async (s) => {
        try {
          const { data } = await axiosInstance.get<
            Array<{
              id: string;
              fileName: string;
              contentType: string;
              size: number;
            }>
          >("/attachments", {
            params: { ownerType: "stage_output", ownerId: s.id },
          });
          return data.map((d) => ({ ...d, stageName: s.name }));
        } catch {
          return [];
        }
      }),
    ).then((lists) => {
      if (!cancelled) setDocs(lists.flat());
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stages.map((s) => s.id))]);

  const download = async (doc: InheritedDoc) => {
    const { data } = await axiosInstance.get<Blob>(
      `/attachments/${doc.id}/download`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (docs.length === 0) return null;

  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">
        Input documents from connected outputs
      </span>
      <ul className="divide-y rounded-md border border-dashed border-teal-500/40 text-sm">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-2 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate">{doc.fileName}</div>
              <div className="flex items-center gap-1 text-xs text-teal-300">
                <Link2 className="h-3 w-3" />
                output of "{doc.stageName}"
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isViewable(doc.fileName, doc.contentType) && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="View"
                  onClick={() => setViewing(doc)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                aria-label="Download"
                onClick={() => void download(doc)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {viewing && (
        <FileViewerDialog
          key={viewing.id}
          attachment={viewing}
          open={Boolean(viewing)}
          onOpenChange={(o) => !o && setViewing(null)}
          onDownload={() => void download(viewing)}
        />
      )}
    </div>
  );
}

/**
 * Products recorded as this stage's output. Shown once the stage is completed;
 * lets members review what was produced and record more (or remove, with the
 * delete permission).
 */
export function StageProductsPanel({
  stageId,
  onAdd,
}: {
  stageId: string;
  /** Opens the shared StageProductDialog owned by the stage detail dialog. */
  onAdd: () => void;
}) {
  const { has } = usePermissions();
  const invalidate = useInvalidate();
  const { mutate: deleteProduct } = useDelete();

  const { result, query } = useList<StageProduct>({
    resource: "products",
    filters: [{ field: "stageId", operator: "eq", value: stageId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: has("products:read"), retry: false },
    errorNotification: false,
  });
  const items = result?.data ?? [];

  if (!has("products:read")) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Output products</span>
        <Can perm="products:create">
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Record product
          </Button>
        </Can>
      </div>

      {query.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No products recorded for this stage yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded border p-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">
                  <span className="font-mono text-xs text-primary">
                    {p.code}
                  </span>{" "}
                  · {p.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.productType?.name ?? "—"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {p.quantity}
                  {p.materialUnit?.name ? ` ${p.materialUnit.name}` : ""}
                </span>
                <Can perm="products:delete">
                  <Button
                    size="icon"
                    variant="outline"
                    title="Delete product"
                    onClick={() =>
                      deleteProduct(
                        { resource: "products", id: p.id },
                        {
                          onSuccess: () =>
                            invalidate({
                              resource: "products",
                              invalidates: ["list"],
                            }),
                        },
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Can>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
