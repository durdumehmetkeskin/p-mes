import { useApiUrl, useCustomMutation, useList } from "@refinedev/core";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  MapPin,
  Maximize2,
  Minimize2,
  Network,
  Timer,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/providers/axios";
import { usePermissions } from "@/hooks/use-permissions";
import { ConfirmDelete } from "../confirm-delete";
import { computeUnlockedIds, layoutDag, wouldCreateCycle } from "./dag-layout";
import {
  IO_EDGE_COLOR,
  kindFromHandles,
  StageIcon,
  type CanvasLinkKind,
} from "./template-canvas";

export interface ProcessCanvasStage {
  id: string;
  name: string;
  sequence: number;
  status: string;
  input?: string | null;
  output?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  estimatedStartDate?: string | null;
  estimatedCompletedDate?: string | null;
  posX?: number | null;
  posY?: number | null;
  workers?: Array<{ name: string }>;
  incomingLinks?: Array<{ fromStageId: string; kind?: CanvasLinkKind }>;
}

interface FlowProduct {
  id: string;
  code: string;
  name: string;
  quantity: number;
  stageId?: string | null;
  consumedByStageId?: string | null;
  materialUnit?: { name: string } | null;
}

interface ProductChip {
  id: string;
  label: string;
}

interface SectionReservationRow {
  id: string;
  stageId: string | null;
  startDate: string;
  endDate: string;
  section: {
    id: string;
    code: string;
    name: string;
    locationId: string;
  } | null;
}

interface LocationRow {
  id: string;
  code: string;
  name: string;
}

type ProcessNodeType = Node<{
  label: string;
  sequence: number;
  status: string;
  locked: boolean;
  input: string;
  output: string;
  workerNames: string[];
  inputProducts: ProductChip[];
  outputProducts: ProductChip[];
  timing: string | null;
  /** "Location · Section (dd.MM–dd.MM)" from the stage's section reservation. */
  place: string | null;
  /** Set only for users who may delete (process responsible or admin). */
  onDelete?: () => void;
}>;

const fmtDateTime = (v?: string | null): string | null =>
  v
    ? new Date(v).toLocaleString([], {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

const fmtDate = (v?: string | null): string | null =>
  v ? new Date(v).toLocaleDateString() : null;

/**
 * Status-based timing line: completed → actual start/finish; in progress →
 * actual start + estimated finish; pending → estimated start/finish.
 * "~" marks estimates.
 */
function timingOf(s: ProcessCanvasStage): string | null {
  if (s.status === "completed") {
    return `${fmtDateTime(s.startedAt) ?? "—"} → ${fmtDateTime(s.completedAt) ?? "—"}`;
  }
  if (s.status === "in_progress") {
    const est = fmtDate(s.estimatedCompletedDate);
    return `${fmtDateTime(s.startedAt) ?? "—"} → ${est ? `~${est}` : "?"}`;
  }
  const start = fmtDate(s.estimatedStartDate);
  const end = fmtDate(s.estimatedCompletedDate);
  if (!start && !end) return null;
  return `${start ? `~${start}` : "?"} → ${end ? `~${end}` : "?"}`;
}

function statusAccent(status: string, locked: boolean): string {
  if (status === "completed") return "border-l-green-500";
  if (status === "in_progress") return "border-l-blue-500";
  if (locked) return "border-l-border";
  return "border-l-muted-foreground/40";
}

function statusClasses(status: string, locked: boolean): string {
  if (status === "completed") return "border-green-600/50 bg-green-950/30";
  if (status === "in_progress") return "border-blue-500/50 bg-blue-950/30";
  if (locked) return "border-border bg-muted/40 opacity-75";
  return "border-border bg-card";
}

function StatusIcon({ status, locked }: { status: string; locked: boolean }) {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />;
  if (status === "in_progress")
    return <Timer className="h-4 w-4 shrink-0 text-blue-400" />;
  if (locked) return <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function ChipRow({
  chips,
  tone,
  prefix,
}: {
  chips: ProductChip[];
  tone: "in" | "out";
  prefix: string;
}) {
  const toneClasses =
    tone === "in"
      ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  const labelTone = tone === "in" ? "text-sky-300" : "text-emerald-300";
  return (
    <div className="flex items-start gap-1 px-2 py-1">
      <span
        className={`mt-0.5 w-7 shrink-0 text-[9px] font-semibold uppercase tracking-wide ${labelTone}`}
      >
        {prefix}
      </span>
      {chips.length > 0 && (
        <span className="flex min-w-0 flex-wrap gap-1">
          {chips.slice(0, 2).map((c) => (
            <span
              key={c.id}
              className={`max-w-[150px] truncate rounded border px-1 py-px text-[9px] leading-tight ${toneClasses}`}
            >
              {c.label}
            </span>
          ))}
          {chips.length > 2 && (
            <span className="rounded border border-border px-1 py-px text-[9px] text-muted-foreground">
              +{chips.length - 2}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function ProcessNode({ data, selected }: NodeProps<ProcessNodeType>) {
  return (
    <div
      className={`relative w-[250px] rounded-lg border border-l-4 shadow-sm ${statusAccent(
        data.status,
        data.locked,
      )} ${statusClasses(data.status, data.locked)} ${
        selected ? "ring-1 ring-primary" : ""
      }`}
    >
      {/* Corner delete — process responsible or admin only. */}
      {data.onDelete && (
        <div className="absolute -right-2 -top-2 z-10">
          <ConfirmDelete
            title={`Delete stage "${data.label}"?`}
            description="Reserved materials and tools return to available stock; dependent stages become startable roots."
            onConfirm={data.onDelete}
            trigger={
              <button
                type="button"
                aria-label="Delete stage"
                className="nodrag nopan flex h-5 w-5 items-center justify-center rounded-full border bg-card text-destructive shadow hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <X className="h-3 w-3" />
              </button>
            }
          />
        </div>
      )}
      {/* Header row — sequence-arrow ports (gray) sit at this height. */}
      <div className="relative flex items-center gap-2 px-2.5 py-2">
        <StatusIcon status={data.status} locked={data.locked} />
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/15 text-primary">
          <StageIcon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium leading-tight">
            {data.sequence}. {data.label}
          </div>
          {data.workerNames.length > 0 && (
            <div className="truncate text-[10px] text-muted-foreground">
              👥{" "}
              {data.workerNames.slice(0, 2).join(", ")}
              {data.workerNames.length > 2 &&
                ` +${data.workerNames.length - 2}`}
            </div>
          )}
        </div>
        <Handle
          id="seq-in"
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-background !bg-muted-foreground"
        />
        <Handle
          id="seq-out"
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-background !bg-muted-foreground"
        />
      </div>
      {/* IO rows — always rendered so the IO ports exist from first mount. */}
      <div className="border-t">
        <div className="relative">
          <Handle
            id="io-in"
            type="target"
            position={Position.Left}
            className="!h-3 !w-3 !border-2 !border-background !bg-sky-400"
          />
          <ChipRow chips={data.inputProducts} tone="in" prefix="IN" />
        </div>
        <div className="relative">
          <ChipRow chips={data.outputProducts} tone="out" prefix="OUT" />
          <Handle
            id="io-out"
            type="source"
            position={Position.Right}
            className="!h-3 !w-3 !border-2 !border-background !bg-emerald-400"
          />
        </div>
      </div>
      {/* Where the stage will run — from its section reservation. */}
      {data.place && (
        <div className="flex items-center gap-1 border-t px-2 py-1 text-[9px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0 text-amber-400" />
          <span className="truncate">{data.place}</span>
        </div>
      )}
      {/* Status-based timing: actuals plain, estimates marked with "~". */}
      {data.timing && (
        <div className="flex items-center gap-1 border-t px-2 py-1 text-[9px] text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span className="truncate">{data.timing}</span>
        </div>
      )}
    </div>
  );
}

const nodeTypes = { processStage: ProcessNode };

const productLabel = (products: FlowProduct[]): string => {
  const names = products.map((p) => p.name);
  return names.length > 2
    ? `${names.slice(0, 2).join(", ")} +${names.length - 2}`
    : names.join(", ");
};

/**
 * The process's stages as an embedded Dify-style DAG canvas. Cards show the
 * stage's real recorded input/output PRODUCTS (chips; free-text as fallback),
 * solid arrows are execution dependencies (labeled with the products that
 * flow along them), and dashed arrows visualize output → input product flow
 * between stages that have no execution edge. While the process is a DRAFT
 * (process responsible or admin), dependencies are edited directly here.
 */
function ProcessCanvasInner({
  processId,
  orderId,
  stages,
  editable = false,
  movable = false,
  onOpenStage,
  onDeleteStage,
  onChanged,
}: {
  processId: string;
  /** Owning order — used to fetch the stages' section reservations. */
  orderId?: string;
  stages: ProcessCanvasStage[];
  editable?: boolean;
  /** Drag & drop node positions (responsible or admin; persisted). */
  movable?: boolean;
  onOpenStage: (stageId: string) => void;
  /** Set only for users who may delete stages (responsible or admin). */
  onDeleteStage?: (stageId: string) => void;
  onChanged?: () => void;
}) {
  const apiUrl = useApiUrl();
  const { mutate } = useCustomMutation();
  const { fitView } = useReactFlow();
  // Live positions while/after dragging (wins over persisted posX/posY until
  // the refetched payload catches up).
  const [posOverride, setPosOverride] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [arranging, setArranging] = useState(false);
  // CSS fullscreen (fixed overlay) — keeps portaled dialogs working, unlike
  // the native Fullscreen API. Esc collapses; view refits on toggle.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);
  useEffect(() => {
    requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 200 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Products produced by this process's stages + products (from anywhere)
  // consumed by them — together they draw the output → input flow.
  const { result: produced } = useList<FlowProduct>({
    resource: "products",
    filters: [{ field: "processId", operator: "eq", value: processId }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const { result: consumed } = useList<FlowProduct>({
    resource: "products",
    filters: [
      { field: "consumedByProcessId", operator: "eq", value: processId },
    ],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const products = useMemo(() => {
    const byId = new Map<string, FlowProduct>();
    for (const p of produced?.data ?? []) byId.set(p.id, p);
    for (const p of consumed?.data ?? []) byId.set(p.id, p);
    return [...byId.values()];
  }, [produced?.data, consumed?.data]);

  // Where each stage will run: its section reservation(s). Section carries
  // only locationId, so location names come from the (small) locations list.
  // Decoration only — don't even ask without the read key (a plain member
  // would just collect 403s in the console).
  const { has } = usePermissions();
  const { result: reservations } = useList<SectionReservationRow>({
    resource: "section-reservations",
    filters: [{ field: "orderId", operator: "eq", value: orderId ?? "" }],
    pagination: { mode: "off" },
    queryOptions: {
      enabled: Boolean(orderId) && has("section-reservations:read"),
      retry: false,
    },
    errorNotification: false,
  });
  const { result: locations } = useList<LocationRow>({
    resource: "locations",
    pagination: { mode: "off" },
    queryOptions: {
      enabled: Boolean(orderId) && (reservations?.data ?? []).length > 0,
      retry: false,
    },
    errorNotification: false,
  });
  const placeOf = useMemo(() => {
    const locationById = new Map(
      (locations?.data ?? []).map((l) => [l.id, l]),
    );
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString([], { day: "2-digit", month: "2-digit" });
    const map = new Map<string, string>();
    const extra = new Map<string, number>();
    for (const r of reservations?.data ?? []) {
      if (!r.stageId || !r.section) continue;
      if (map.has(r.stageId)) {
        extra.set(r.stageId, (extra.get(r.stageId) ?? 0) + 1);
        continue;
      }
      const location = locationById.get(r.section.locationId);
      const where = [location?.name ?? location?.code, r.section.name]
        .filter(Boolean)
        .join(" · ");
      map.set(
        r.stageId,
        `${where} (${fmt(r.startDate)}–${fmt(r.endDate)})`,
      );
    }
    for (const [stageId, n] of extra) {
      map.set(stageId, `${map.get(stageId)!} +${n}`);
    }
    return map;
  }, [reservations?.data, locations?.data]);

  const links = useMemo(
    () =>
      stages.flatMap((s) =>
        (s.incomingLinks ?? []).map((l) => ({
          from: l.fromStageId,
          to: s.id,
          kind: (l.kind ?? "sequence") as CanvasLinkKind,
        })),
      ),
    [stages],
  );

  const { nodes, edges } = useMemo(() => {
    const stageIds = new Set(stages.map((s) => s.id));
    const positions = layoutDag(
      stages.map((s) => s.id),
      links,
    );
    const unlocked = computeUnlockedIds(stages);
    const byId = new Map(stages.map((s) => [s.id, s]));

    const chip = (p: FlowProduct): ProductChip => ({
      id: p.id,
      label: `${p.name} ×${p.quantity}${
        p.materialUnit?.name ? ` ${p.materialUnit.name}` : ""
      }`,
    });
    // io predecessors per stage — their outputs flow into this stage's inputs.
    const ioPredsOf = new Map<string, string[]>(
      stages.map((s) => [
        s.id,
        (s.incomingLinks ?? [])
          .filter((l) => (l.kind ?? "sequence") === "io")
          .map((l) => l.fromStageId),
      ]),
    );
    const inputsOf = (stageId: string) => {
      const preds = new Set(ioPredsOf.get(stageId) ?? []);
      const seen = new Set<string>();
      const rows: ProductChip[] = [];
      for (const p of products) {
        const direct = p.consumedByStageId === stageId;
        // Inherited via an io arrow: the predecessor's output, as long as it
        // hasn't been consumed by some OTHER stage.
        const inherited =
          p.stageId &&
          preds.has(p.stageId) &&
          (!p.consumedByStageId || p.consumedByStageId === stageId);
        if ((direct || inherited) && !seen.has(p.id)) {
          seen.add(p.id);
          rows.push(chip(p));
        }
      }
      return rows;
    };
    const outputsOf = (stageId: string) =>
      products.filter((p) => p.stageId === stageId).map(chip);

    const nodes: ProcessNodeType[] = stages.map((s) => ({
      id: s.id,
      type: "processStage",
      // Live drag override > persisted position > dagre auto-layout.
      position:
        posOverride[s.id] ??
        (s.posX != null && s.posY != null
          ? { x: s.posX, y: s.posY }
          : (positions.get(s.id) ?? { x: 0, y: 0 })),
      data: {
        label: s.name,
        sequence: s.sequence,
        status: s.status,
        locked: s.status === "pending" && !unlocked.has(s.id),
        input: s.input ?? "",
        output: s.output ?? "",
        workerNames: (s.workers ?? []).map((w) => w.name),
        inputProducts: inputsOf(s.id),
        outputProducts: outputsOf(s.id),
        timing: timingOf(s),
        place: placeOf.get(s.id) ?? null,
        onDelete: onDeleteStage ? () => onDeleteStage(s.id) : undefined,
      },
      draggable: movable,
      connectable: editable,
    }));

    // Product flow between two stages of THIS process: producer → consumer.
    const flowByPair = new Map<string, FlowProduct[]>();
    for (const p of products) {
      if (
        p.stageId &&
        p.consumedByStageId &&
        stageIds.has(p.stageId) &&
        stageIds.has(p.consumedByStageId)
      ) {
        const key = `${p.stageId}->${p.consumedByStageId}`;
        flowByPair.set(key, [...(flowByPair.get(key) ?? []), p]);
      }
    }

    // With handle ids in play, EVERY edge must name its handles or React
    // Flow silently drops it (v12).
    const ioPairs = new Set(
      links.filter((l) => l.kind === "io").map((l) => `${l.from}->${l.to}`),
    );
    const explicitEdges: Edge[] = links.map((l) => {
      const pair = `${l.from}->${l.to}`;
      const flowing = flowByPair.get(pair) ?? [];
      const isIo = l.kind === "io";
      // Product labels ride the io edge when the pair has both kinds.
      const showLabel = isIo || !ioPairs.has(pair);
      const labelText =
        showLabel && flowing.length > 0 ? productLabel(flowing) : undefined;
      return {
        id: `${l.kind}:${pair}`,
        source: l.from,
        target: l.to,
        sourceHandle: isIo ? "io-out" : "seq-out",
        targetHandle: isIo ? "io-in" : "seq-in",
        animated: byId.get(l.from)?.status === "in_progress",
        deletable: editable,
        focusable: editable,
        ...(isIo
          ? {
              style: { stroke: IO_EDGE_COLOR },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 18,
                height: 18,
                color: IO_EDGE_COLOR,
              },
              labelStyle: { fill: IO_EDGE_COLOR, fontSize: 10 },
            }
          : {
              labelStyle: { fill: "var(--foreground)", fontSize: 10 },
            }),
        label: labelText,
        labelBgStyle: { fill: "var(--card)", fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      };
    });

    // Derived output → input product flow with NO explicit edge of either
    // kind: dashed teal arrow (a product doesn't have to feed the
    // immediately-dependent stage).
    const explicitPairs = new Set(links.map((l) => `${l.from}->${l.to}`));
    const flowEdges: Edge[] = [...flowByPair.entries()]
      .filter(([key]) => !explicitPairs.has(key))
      .map(([key, flowing]) => {
        const [from, to] = key.split("->");
        return {
          id: `pf:${key}`,
          source: from,
          target: to,
          sourceHandle: "io-out",
          targetHandle: "io-in",
          deletable: false,
          selectable: false,
          focusable: false,
          style: {
            stroke: IO_EDGE_COLOR,
            strokeDasharray: "6 4",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: IO_EDGE_COLOR,
          },
          label: productLabel(flowing),
          labelStyle: { fill: IO_EDGE_COLOR, fontSize: 10 },
          labelBgStyle: { fill: "var(--card)", fillOpacity: 0.9 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        };
      });

    return { nodes, edges: [...explicitEdges, ...flowEdges] };
  }, [
    stages,
    links,
    products,
    editable,
    movable,
    posOverride,
    onDeleteStage,
    placeOf,
  ]);

  const saveLinks = (
    next: Array<{ from: string; to: string; kind: CanvasLinkKind }>,
  ) =>
    mutate(
      {
        url: `${apiUrl}/processes/${processId}/stages/links`,
        method: "put",
        values: {
          links: next.map((l) => ({
            fromStageId: l.from,
            toStageId: l.to,
            kind: l.kind,
          })),
        },
      },
      { onSuccess: () => onChanged?.() },
    );

  const onConnect = (connection: Connection) => {
    if (!editable || !connection.source || !connection.target) return;
    const kind = kindFromHandles(
      connection.sourceHandle,
      connection.targetHandle,
    );
    if (!kind) {
      toast.error(
        "Connect sequence ports (gray) together, or an OUT port to an IN port.",
      );
      return;
    }
    const candidate = { from: connection.source, to: connection.target, kind };
    if (candidate.from === candidate.to) return;
    if (
      links.some(
        (l) =>
          l.from === candidate.from &&
          l.to === candidate.to &&
          l.kind === candidate.kind,
      )
    )
      return;
    // Both kinds gate, so cycles are checked over the union of both.
    if (wouldCreateCycle(links, candidate)) {
      toast.error("This connection would create a cycle.");
      return;
    }
    saveLinks([...links, candidate]);
  };

  /**
   * Re-arrange all nodes with dagre according to the CURRENT connections
   * (both arrow kinds) and persist the resulting positions.
   */
  const autoArrange = async () => {
    setArranging(true);
    try {
      const positions = layoutDag(
        stages.map((s) => s.id),
        links,
      );
      const next: Record<string, { x: number; y: number }> = {};
      for (const [id, p] of positions) next[id] = p;
      setPosOverride(next);
      await Promise.all(
        stages.map((s) => {
          const p = positions.get(s.id);
          return p
            ? axiosInstance.patch(`/process-stages/${s.id}`, {
                posX: p.x,
                posY: p.y,
              })
            : Promise.resolve();
        }),
      );
      onChanged?.();
      requestAnimationFrame(() => {
        void fitView({ padding: 0.2, duration: 300 });
      });
    } catch {
      toast.error("Could not re-arrange the layout.");
    } finally {
      setArranging(false);
    }
  };

  const onEdgesDelete = (deleted: Edge[]) => {
    if (!editable) return;
    // Dashed product-flow edges (pf:*) are derived data — not deletable.
    const removed = new Set(
      deleted.filter((e) => !e.id.startsWith("pf:")).map((e) => e.id),
    );
    if (removed.size === 0) return;
    saveLinks(
      links.filter((l) => !removed.has(`${l.kind}:${l.from}->${l.to}`)),
    );
  };

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-background"
          : "flex h-[400px] flex-col overflow-hidden rounded-md border"
      }
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        }}
        nodesDraggable={movable}
        nodesConnectable={editable}
        deleteKeyCode={editable ? ["Delete", "Backspace"] : null}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={(_, node) => onOpenStage(node.id)}
        onNodesChange={(changes) => {
          if (!movable) return;
          for (const change of changes) {
            if (change.type === "position" && change.position) {
              const { x, y } = change.position;
              setPosOverride((prev) => ({ ...prev, [change.id]: { x, y } }));
            }
          }
        }}
        onNodeDragStop={(_, node) => {
          if (!movable) return;
          mutate(
            {
              url: `${apiUrl}/process-stages/${node.id}`,
              method: "patch",
              values: { posX: node.position.x, posY: node.position.y },
              successNotification: false,
            },
            { onSuccess: () => onChanged?.() },
          );
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} />
        {/* Fit-view (⛶) hidden — its icon reads as "fullscreen"; the real
            fullscreen toggle lives in the top-right panel. */}
        <Controls showInteractive={false} showFitView={false} />
        <MiniMap pannable zoomable className="!bg-card" />
        <Panel position="top-right" className="flex gap-1">
          {movable && (
            <Button
              size="sm"
              variant="outline"
              disabled={arranging}
              onClick={() => void autoArrange()}
              title="Arrange nodes by their connections"
            >
              <Network className="mr-1 h-4 w-4" />
              {arranging ? "Arranging..." : "Auto-layout"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Exit fullscreen (Esc)" : "Fullscreen"}
          >
            {expanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </Panel>
      </ReactFlow>
      <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
        Gray arrow (header ports) = sequence "must finish first" · teal arrow
        (OUT → IN ports) = output feeds input — both count as prerequisites ·
        dashed teal = recorded product flow · IN/OUT chips = recorded
        products.{" "}
        {editable
          ? "Draft — drag from a port to connect; select an arrow and press Delete to remove it. Click a stage to open it."
          : "Click a stage to open it."}
      </div>
    </div>
  );
}

export default function ProcessCanvas(props: {
  processId: string;
  orderId?: string;
  stages: ProcessCanvasStage[];
  editable?: boolean;
  movable?: boolean;
  onOpenStage: (stageId: string) => void;
  onDeleteStage?: (stageId: string) => void;
  onChanged?: () => void;
}) {
  return (
    <ReactFlowProvider>
      <ProcessCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
