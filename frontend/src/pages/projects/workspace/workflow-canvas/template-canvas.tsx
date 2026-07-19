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
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Box,
  GripVertical,
  Maximize2,
  Minimize2,
  Network,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type DragEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { layoutDag, wouldCreateCycle } from "./dag-layout";

export interface CanvasStage {
  key: string;
  name: string;
  input: string;
  output: string;
  posX: number | null;
  posY: number | null;
}

export type CanvasLinkKind = "sequence" | "io";

export interface CanvasLink {
  fromKey: string;
  toKey: string;
  /** 'sequence' = execution order; 'io' = from's OUTPUT feeds to's INPUT. */
  kind: CanvasLinkKind;
}

/** Map connected handle ids to an arrow kind (null = invalid combination). */
export function kindFromHandles(
  sourceHandle?: string | null,
  targetHandle?: string | null,
): CanvasLinkKind | null {
  if (sourceHandle === "seq-out" && targetHandle === "seq-in")
    return "sequence";
  if (sourceHandle === "io-out" && targetHandle === "io-in") return "io";
  return null;
}

export const IO_EDGE_COLOR = "rgb(45 212 191)"; // teal-400

interface Props {
  stages: CanvasStage[];
  links: CanvasLink[];
  onAddStage: (pos: { x: number; y: number }) => void;
  onPatchStage: (key: string, patch: Partial<CanvasStage>) => void;
  onRemoveStage: (key: string) => void;
  onAddLink: (link: CanvasLink) => void;
  onRemoveLink: (link: CanvasLink) => void;
}

const DND_MIME = "application/x-pmes-stage";

/** Node icon — stages are all one kind, so one shared identity. */
export function StageIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <Box className={className} />;
}

type StageNodeType = Node<{
  label: string;
  input: string;
  output: string;
  onRemove: () => void;
}>;

function StageNode({ data, selected }: NodeProps<StageNodeType>) {
  return (
    <div
      className={`relative w-[250px] rounded-lg border bg-card shadow-sm transition-shadow ${
        selected ? "border-primary ring-1 ring-primary" : "hover:shadow-md"
      }`}
    >
      {/* Corner delete. */}
      <button
        type="button"
        aria-label="Remove stage"
        className="nodrag nopan absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border bg-card text-destructive shadow hover:bg-destructive hover:text-destructive-foreground"
        onClick={(e) => {
          e.stopPropagation();
          data.onRemove();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <X className="h-3 w-3" />
      </button>
      {/* Header row — sequence-arrow ports (gray) sit at this height. */}
      <div className="relative flex items-center gap-2 px-3 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <StageIcon />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{data.label}</div>
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
      {/* IO port rows — always rendered so the IO ports exist from first
          mount. Just the port labels; connections carry the meaning. */}
      <div className="border-t">
        <div className="relative flex items-center px-2 py-1">
          <Handle
            id="io-in"
            type="target"
            position={Position.Left}
            className="!h-3 !w-3 !border-2 !border-background !bg-sky-400"
          />
          <span className="text-[9px] font-semibold uppercase tracking-wide text-sky-300">
            IN
          </span>
        </div>
        <div className="relative flex items-center justify-end px-2 py-1">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
            OUT
          </span>
          <Handle
            id="io-out"
            type="source"
            position={Position.Right}
            className="!h-3 !w-3 !border-2 !border-background !bg-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { stage: StageNode };
const edgeId = (l: CanvasLink) => `${l.kind}:${l.fromKey}->${l.toKey}`;

function CanvasInner({
  stages,
  links,
  onAddStage,
  onPatchStage,
  onRemoveStage,
  onAddLink,
  onRemoveLink,
}: Props) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = stages.find((s) => s.key === selectedKey) ?? null;

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

  /** Re-arrange all nodes with dagre according to the current connections. */
  const autoArrange = () => {
    const positions = layoutDag(
      stages.map((s) => s.key),
      links.map((l) => ({ from: l.fromKey, to: l.toKey })),
    );
    for (const [key, p] of positions) {
      onPatchStage(key, { posX: p.x, posY: p.y });
    }
    requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 300 });
    });
  };

  // Auto-layout only for stages without persisted positions (legacy data).
  const autoPositions =
    stages.some((s) => s.posX == null || s.posY == null)
      ? layoutDag(
          stages.map((s) => s.key),
          links.map((l) => ({ from: l.fromKey, to: l.toKey })),
        )
      : null;

  const nodes: StageNodeType[] = stages.map((s) => ({
    id: s.key,
    type: "stage",
    position:
      s.posX != null && s.posY != null
        ? { x: s.posX, y: s.posY }
        : (autoPositions?.get(s.key) ?? { x: 80, y: 80 }),
    data: {
      label: s.name || "Stage",
      input: s.input,
      output: s.output,
      onRemove: () => {
        onRemoveStage(s.key);
        setSelectedKey((prev) => (prev === s.key ? null : prev));
      },
    },
    selected: s.key === selectedKey,
  }));

  // With handle ids in play, EVERY edge must name its handles or React Flow
  // silently drops it.
  const edges: Edge[] = links.map((l) => {
    const isIo = l.kind === "io";
    return {
      id: edgeId(l),
      source: l.fromKey,
      target: l.toKey,
      sourceHandle: isIo ? "io-out" : "seq-out",
      targetHandle: isIo ? "io-in" : "seq-in",
      ...(isIo
        ? {
            style: { stroke: IO_EDGE_COLOR },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 18,
              height: 18,
              color: IO_EDGE_COLOR,
            },
          }
        : {}),
    };
  });

  const onNodesChange = (changes: NodeChange<StageNodeType>[]) => {
    for (const change of changes) {
      if (change.type === "position" && change.position) {
        onPatchStage(change.id, {
          posX: change.position.x,
          posY: change.position.y,
        });
      }
    }
  };

  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return;
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
    const candidate: CanvasLink = {
      fromKey: connection.source,
      toKey: connection.target,
      kind,
    };
    if (candidate.fromKey === candidate.toKey) return;
    if (
      links.some(
        (l) =>
          l.fromKey === candidate.fromKey &&
          l.toKey === candidate.toKey &&
          l.kind === candidate.kind,
      )
    ) {
      return;
    }
    // Both kinds gate, so cycles are checked over the union of both.
    if (
      wouldCreateCycle(
        links.map((l) => ({ from: l.fromKey, to: l.toKey })),
        { from: candidate.fromKey, to: candidate.toKey },
      )
    ) {
      toast.error("This connection would create a cycle.");
      return;
    }
    onAddLink(candidate);
  };

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      if (!event.dataTransfer.getData(DND_MIME)) return;
      const pos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      onAddStage(pos);
    },
    [screenToFlowPosition, onAddStage],
  );

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-50 flex overflow-hidden bg-background"
          : "flex h-full min-h-[480px] overflow-hidden rounded-md border"
      }
    >
      {/* Palette — drag the stage block onto the canvas (or click to add). */}
      <div className="flex w-60 shrink-0 flex-col border-r bg-card/50">
        <div className="border-b px-3 py-2 text-sm font-medium">Stages</div>
        <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DND_MIME, "stage");
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() =>
              onAddStage({
                x: 120 + (stages.length % 3) * 260,
                y: 100 + Math.floor(stages.length / 3) * 140,
              })
            }
            className="flex cursor-grab items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm hover:border-primary/50 active:cursor-grabbing"
            title="Drag onto the canvas (or click to add)"
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/15 text-primary">
              <StageIcon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">New stage</div>
              <div className="truncate text-[10px] text-muted-foreground">
                Name it in the right panel
              </div>
            </div>
          </div>
        </div>
        <div className="border-t p-2 text-[10px] leading-relaxed text-muted-foreground">
          Drag stages onto the canvas. Connect handles to define "must complete
          before". Select a node/edge and press Delete to remove it.
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1">
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
          deleteKeyCode={["Delete", "Backspace"]}
          onNodesChange={onNodesChange}
          onNodesDelete={(deleted) => {
            for (const n of deleted) onRemoveStage(n.id);
            setSelectedKey(null);
          }}
          onEdgesDelete={(deleted) => {
            for (const e of deleted) {
              const link = links.find((l) => edgeId(l) === e.id);
              if (link) onRemoveLink(link);
            }
          }}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedKey(node.id)}
          onPaneClick={() => setSelectedKey(null)}
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} />
          {/* Fit-view (⛶) hidden — its icon reads as "fullscreen"; the real
              fullscreen toggle lives in the top-right panel. */}
          <Controls showInteractive={false} showFitView={false} />
          <MiniMap pannable zoomable className="!bg-card" />
          <Panel position="top-right" className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={autoArrange}
              title="Arrange nodes by their connections"
            >
              <Network className="mr-1 h-4 w-4" />
              Auto-layout
            </Button>
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
      </div>

      {/* Config panel — Dify-style right panel for the selected node. */}
      {selected && (
        <div className="flex w-80 shrink-0 flex-col border-l bg-card/50">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                <StageIcon />
              </span>
              <span className="truncate text-sm font-medium">
                {selected.name || "Stage"}
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSelectedKey(null)}
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="node-name">Stage name</Label>
              <Input
                id="node-name"
                value={selected.name}
                onChange={(e) =>
                  onPatchStage(selected.key, { name: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="node-input">Input</Label>
              <Input
                id="node-input"
                value={selected.input}
                placeholder="e.g. sac levha"
                onChange={(e) =>
                  onPatchStage(selected.key, { input: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="node-output">Output</Label>
              <Input
                id="node-output"
                value={selected.output}
                placeholder="e.g. ara ürün"
                onChange={(e) =>
                  onPatchStage(selected.key, { output: e.target.value })
                }
              />
            </div>
            <div className="rounded-md border p-2 text-xs text-muted-foreground">
              <div>
                Prerequisites:{" "}
                {links.filter((l) => l.toKey === selected.key).length}
              </div>
              <div>
                Next stages:{" "}
                {links.filter((l) => l.fromKey === selected.key).length}
              </div>
            </div>
          </div>
          <div className="border-t p-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                onRemoveStage(selected.key);
                setSelectedKey(null);
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Remove stage
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Dify-style node editor for workflow templates: a full-height canvas with a
 * draggable stage-type palette on the left and a config panel on the right.
 * All editing is drag & drop — the parent page owns the state.
 */
export default function TemplateCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
