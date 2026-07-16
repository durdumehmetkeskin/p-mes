import dagre from "@dagrejs/dagre";

export interface LayoutEdge {
  from: string;
  to: string;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

const NODE_WIDTH = 250;
const NODE_HEIGHT = 142;

/**
 * Auto-layout for DAG nodes without persisted positions (legacy linear
 * templates, runtime graph view). Left-to-right by default; returns the
 * top-left position per node id (dagre yields centers).
 */
export function layoutDag(
  nodeIds: string[],
  edges: LayoutEdge[],
  direction: "LR" | "TB" = "LR",
): Map<string, LayoutPoint> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 90 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const id of nodeIds) {
    g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    g.setEdge(e.from, e.to);
  }
  dagre.layout(g);
  const out = new Map<string, LayoutPoint>();
  for (const id of nodeIds) {
    const n = g.node(id);
    out.set(id, { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 });
  }
  return out;
}

/** Would adding `candidate` to `edges` create a cycle? (DFS from to → from.) */
export function wouldCreateCycle(
  edges: LayoutEdge[],
  candidate: LayoutEdge,
): boolean {
  if (candidate.from === candidate.to) return true;
  const outgoing = new Map<string, string[]>();
  for (const e of edges) {
    const list = outgoing.get(e.from) ?? [];
    list.push(e.to);
    outgoing.set(e.from, list);
  }
  // A cycle appears iff `from` is already reachable from `to`.
  const stack = [candidate.to];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === candidate.from) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(outgoing.get(id) ?? []));
  }
  return false;
}

/**
 * DAG lock rule shared by list + graph views: a stage is unlocked iff every
 * incoming-link source is completed (no incoming links → unlocked root).
 */
export function computeUnlockedIds(
  stages: Array<{
    id: string;
    status: string;
    incomingLinks?: Array<{ fromStageId: string }>;
  }>,
): Set<string> {
  const completed = new Set(
    stages.filter((s) => s.status === "completed").map((s) => s.id),
  );
  return new Set(
    stages
      .filter((s) =>
        (s.incomingLinks ?? []).every((l) => completed.has(l.fromStageId)),
      )
      .map((s) => s.id),
  );
}
