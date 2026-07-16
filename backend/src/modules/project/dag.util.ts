/**
 * Pure DAG helpers shared by the workflow template service (index-keyed nodes)
 * and the process stage service (uuid-keyed nodes). No Nest dependencies —
 * callers translate validation results into HTTP errors.
 */

/** Arrow kinds on the workflow canvas — both gate stage start. */
export type StageLinkKind = 'sequence' | 'io';

export interface DagEdge {
  from: string;
  to: string;
  // Distinguishes duplicates: the same (from,to) pair may carry one edge of
  // EACH kind. Cycle/topo logic ignores it (parallel edges are Kahn-safe).
  kind?: string;
}

export type DagErrorCode = 'unknown_node' | 'self_loop' | 'duplicate' | 'cycle';

export interface DagError {
  code: DagErrorCode;
  detail?: string;
}

/**
 * Structural validation of an edge set over the given nodes: every endpoint
 * must be a known node, no self-loops, no duplicate pairs, and the graph must
 * be acyclic. Returns the first error found, or null when valid.
 */
export function validateDag(
  nodeIds: string[],
  edges: DagEdge[],
): DagError | null {
  const nodes = new Set(nodeIds);
  const seen = new Set<string>();
  for (const e of edges) {
    if (!nodes.has(e.from) || !nodes.has(e.to)) {
      return { code: 'unknown_node', detail: `${e.from} -> ${e.to}` };
    }
    if (e.from === e.to) {
      return { code: 'self_loop', detail: e.from };
    }
    const key = `${e.from} ${e.to} ${e.kind ?? 'sequence'}`;
    if (seen.has(key)) {
      return { code: 'duplicate', detail: `${e.from} -> ${e.to}` };
    }
    seen.add(key);
  }
  if (topoSort(nodeIds, edges, () => 0) === null) {
    return { code: 'cycle' };
  }
  return null;
}

/**
 * Kahn's algorithm. Returns node ids in topological order, or null when the
 * graph has a cycle. Ties (nodes ready at the same time) are broken with the
 * given comparator so the derived display `sequence` is deterministic.
 */
export function topoSort(
  nodeIds: string[],
  edges: DagEdge[],
  compare: (a: string, b: string) => number,
): string[] | null {
  const indegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const outgoing = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  for (const e of edges) {
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
    outgoing.get(e.from)?.push(e.to);
  }

  // Tiny graphs — a re-sorted array beats a heap in clarity.
  const ready = nodeIds.filter((id) => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (ready.length > 0) {
    ready.sort(compare);
    const id = ready.shift()!;
    order.push(id);
    for (const next of outgoing.get(id) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) ready.push(next);
    }
  }
  return order.length === nodeIds.length ? order : null;
}

/** Human-readable message for a DAG validation error. */
export function dagErrorMessage(error: DagError): string {
  switch (error.code) {
    case 'unknown_node':
      return 'Workflow links reference an unknown stage.';
    case 'self_loop':
      return 'A stage cannot depend on itself.';
    case 'duplicate':
      return 'Duplicate workflow link of the same kind between the same two stages.';
    case 'cycle':
      return 'Workflow links must form an acyclic graph (a cycle was found).';
  }
}
