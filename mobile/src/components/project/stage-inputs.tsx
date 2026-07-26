import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useList } from "@refinedev/core";
import { useRouter } from "expo-router";
import { Download, Link2, Plus, X } from "lucide-react-native";
import { toast } from "sonner-native";

import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { SectionLabel } from "@/components/refine-ui/field-row";
import { Icon } from "@/components/ui/icon";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { usePermissions } from "@/hooks/use-permissions";
import { downloadAndShare } from "@/lib/download";
import { showApiError } from "@/components/ui/error-alert";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

interface StageProduct extends BaseRecord {
  id: string;
  code?: string;
  name?: string;
  quantity?: number;
  stageId?: string | null;
  stage?: { id: string; name?: string } | null;
  consumedByStageId?: string | null;
  productType?: { name?: string } | null;
  materialUnit?: { name?: string } | null;
  inputReceivedAt?: string | null;
  inputReceivedByUser?: { name?: string } | null;
}
interface InheritedDoc {
  id: string;
  fileName?: string;
  stageName: string;
}

function errMsg(e: unknown, fallback: string): string {
  const m = (e as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? fallback);
}

/**
 * The stage's INPUTS (mobile port of the web Inputs section): input products
 * (with worker pickup — the stage can't start until every input product is
 * received), outputs/documents flowing in from OUT → IN connected predecessor
 * stages, and the stage_input document panel.
 */
export function StageInputs({
  stageId,
  orderId,
  ioPredecessors = [],
  canEdit = false,
  canReceive = false,
}: {
  stageId: string;
  orderId?: string;
  /** Stages whose OUT port feeds this stage's IN port: id + display name. */
  ioPredecessors?: Array<{ id: string; name: string }>;
  /** Inputs are planned by the process responsible or an admin. */
  canEdit?: boolean;
  /** Stage workers (+ responsible/admin) — may pick the input up (custody). */
  canReceive?: boolean;
}) {
  const { has } = usePermissions();
  const invalidate = useInvalidate();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Direct inputs: products consumed by this stage.
  const { result, query } = useList<StageProduct>({
    resource: "products",
    filters: [{ field: "consumedByStageId", operator: "eq", value: stageId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: has("products:read"), retry: false },
    errorNotification: false,
  });
  const items = useMemo(
    () => (Array.isArray(result?.data) ? result.data : []),
    [result],
  );

  // Outputs flowing in via io arrows: connected predecessors' products,
  // unless consumed by another stage.
  const ioPredSet = useMemo(
    () => new Set(ioPredecessors.map((p) => p.id)),
    [ioPredecessors],
  );
  const { result: orderProducts } = useList<StageProduct>({
    resource: "products",
    filters: [{ field: "orderId", operator: "eq", value: orderId ?? "" }],
    pagination: { mode: "off" },
    queryOptions: {
      enabled:
        Boolean(orderId) && ioPredecessors.length > 0 && has("products:read"),
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

  // Candidates for "Add input": products not yet consumed anywhere.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const { result: candidates } = useList<StageProduct>({
    resource: "products",
    filters: [{ field: "unconsumed", operator: "eq", value: "true" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: pickerOpen && has("products:read"), retry: false },
    errorNotification: false,
  });
  const candidateOptions: SelectOption[] = (candidates?.data ?? [])
    .filter((p) => p.stageId !== stageId)
    .map((p) => ({
      value: String(p.id),
      label:
        `${p.code ?? ""} · ${p.name ?? ""}` +
        (p.stage?.name ? ` — from "${p.stage.name}"` : ""),
    }));

  const refresh = () => {
    invalidate({ resource: "products", invalidates: ["list"] });
    return query.refetch();
  };

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    try {
      await fn();
      await refresh();
    } catch (e) {
      showApiError(e, fallback);
    } finally {
      setBusyId(null);
    }
  };

  const addInput = () => {
    if (!selected) return;
    setBusyId(selected);
    const id = selected;
    setSelected(null);
    setPickerOpen(false);
    void run(
      () => axiosInstance.post(`/products/${id}/consume`, { stageId }),
      "Could not add input",
    );
  };

  const removeInput = (productId: string) => {
    setBusyId(productId);
    void run(
      () => axiosInstance.delete(`/products/${productId}/consume`),
      "Could not remove input",
    );
  };

  // Pickup is QR-ONLY: scanning the product's QR proves physical presence and
  // opens the product handover screen with the receive action unlocked
  // (mirrors the stock-item rule) — no direct receive from this panel.

  // Inherited input documents: the io predecessors' OUTPUT documents flow in
  // as this stage's inputs (read-only; the source stage owns them).
  const [docs, setDocs] = useState<InheritedDoc[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (ioPredecessors.length === 0) {
      setDocs([]);
      return;
    }
    void Promise.all(
      ioPredecessors.map(async (s) => {
        try {
          const { data } = await axiosInstance.get<
            Array<{ id: string; fileName?: string }>
          >("/attachments", {
            params: { ownerType: "stage_output", ownerId: s.id },
          });
          return (data ?? []).map((d) => ({ ...d, stageName: s.name }));
        } catch {
          return [] as InheritedDoc[];
        }
      }),
    ).then((lists) => {
      if (!cancelled) setDocs(lists.flat());
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(ioPredecessors.map((s) => s.id))]);

  if (!has("products:read")) {
    // Members without product read still get the input documents.
    return (
      <AttachmentsPanel
        ownerType="stage_input"
        ownerId={stageId}
        title="Input documents"
        canUpload={canEdit && has("attachments:create")}
      />
    );
  }

  return (
    <View className="gap-3 rounded-lg border border-border bg-card p-4">
      <SectionLabel>Inputs</SectionLabel>

      {/* Input products */}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-sans-semibold uppercase tracking-widest text-muted-foreground">
            Input products ({items.length})
          </Text>
          {canEdit && has("products:consume") ? (
            <Pressable
              onPress={() => setPickerOpen((o) => !o)}
              hitSlop={6}
              className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
            >
              <Icon icon={Plus} size={16} color={colors.foreground} />
            </Pressable>
          ) : null}
        </View>

        {pickerOpen ? (
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <SearchableSelect
                value={selected}
                onChange={setSelected}
                options={candidateOptions}
                placeholder="Select a product"
              />
            </View>
            <Pressable
              onPress={addInput}
              disabled={!selected}
              className="h-10 items-center justify-center rounded-md border border-primary bg-primary px-3 active:opacity-80"
            >
              <Text className="text-xs text-primary-foreground">Add</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Outputs flowing in via OUT → IN connections. Pickup FORMALIZES the
            io link (backend consumes the product onto this stage) — required
            before the stage can start. */}
        {inherited.map((p) => (
          <View
            key={p.id}
            className="gap-1 rounded-md border border-dashed border-info/40 p-2"
          >
            <Text className="text-sm text-foreground">
              <Text className="font-mono text-xs text-primary">{p.code}</Text> ·{" "}
              {p.name}
            </Text>
            <View className="flex-row items-center gap-1">
              <Icon icon={Link2} size={12} color={colors.info} />
              <Text className="text-xs text-info">
                output of "{p.stage?.name ?? "connected stage"}"
              </Text>
            </View>
            {p.inputReceivedAt ? (
              <Text className="text-xs text-muted-foreground">
                Teslim alındı
                {p.inputReceivedByUser?.name
                  ? `: ${p.inputReceivedByUser.name}`
                  : ""}
              </Text>
            ) : (
              <>
                <Text className="text-xs text-warning">
                  Henüz teslim alınmadı — aşama başlatılamaz.
                </Text>
                {canReceive ? (
                  <Pressable
                    onPress={() => router.push("/scan")}
                    className="mt-1 items-center rounded-md border border-primary bg-primary px-3 py-2 active:opacity-80"
                  >
                    <Text className="text-xs text-primary-foreground">
                      Teslim al — QR okut
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        ))}

        {query.isLoading ? (
          <Text className="text-xs text-muted-foreground">Loading…</Text>
        ) : items.length === 0 && inherited.length === 0 ? (
          <Text className="text-xs text-muted-foreground">
            No input products for this stage.
          </Text>
        ) : (
          items.map((p) => (
            <View key={p.id} className="gap-1 rounded-md border border-border p-2">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 pr-2 font-sans-medium text-sm text-foreground">
                  <Text className="font-mono text-xs text-primary">
                    {p.code}
                  </Text>{" "}
                  · {p.name}
                </Text>
                <Text className="font-mono text-xs text-muted-foreground">
                  {p.quantity ?? 0}
                  {p.materialUnit?.name ? ` ${p.materialUnit.name}` : ""}
                </Text>
                {canEdit && has("products:consume") ? (
                  <Pressable
                    onPress={() => removeInput(p.id)}
                    disabled={busyId === p.id}
                    hitSlop={6}
                  >
                    <Icon icon={X} size={16} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>
              {p.inputReceivedAt ? (
                <Text className="text-xs text-muted-foreground">
                  Teslim alındı
                  {p.inputReceivedByUser?.name
                    ? `: ${p.inputReceivedByUser.name}`
                    : ""}
                </Text>
              ) : (
                <>
                  <Text className="text-xs text-warning">
                    Henüz teslim alınmadı — aşama başlatılamaz.
                  </Text>
                  {canReceive ? (
                    <Pressable
                      onPress={() => router.push("/scan")}
                      className="mt-1 items-center rounded-md border border-primary bg-primary px-3 py-2 active:opacity-80"
                    >
                      <Text className="text-xs text-primary-foreground">
                        Teslim al — QR okut
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              )}
            </View>
          ))
        )}
      </View>

      {/* Inherited input documents (io predecessors' outputs, download only). */}
      {docs.length > 0 ? (
        <View className="gap-1 border-t border-border pt-3">
          <Text className="text-[10px] font-sans-semibold uppercase tracking-widest text-muted-foreground">
            Input documents from connected outputs
          </Text>
          {docs.map((d) => (
            <View
              key={d.id}
              className="flex-row items-center justify-between gap-2 rounded-md border border-dashed border-info/40 p-2"
            >
              <View className="flex-1 pr-2">
                <Text className="text-sm text-foreground" numberOfLines={1}>
                  {d.fileName}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Icon icon={Link2} size={12} color={colors.info} />
                  <Text className="text-xs text-info">
                    output of "{d.stageName}"
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() =>
                  downloadAndShare({
                    url: `/attachments/${d.id}/download`,
                    fallbackName: d.fileName ?? "document",
                  }).catch(() => toast.error("Download failed"))
                }
                hitSlop={6}
                className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
              >
                <Icon icon={Download} size={16} color={colors.foreground} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/* This stage's own input documents (stage_input attachments). */}
      <AttachmentsPanel
        ownerType="stage_input"
        ownerId={stageId}
        title="Input documents"
        canUpload={canEdit && has("attachments:create")}
      />
    </View>
  );
}
