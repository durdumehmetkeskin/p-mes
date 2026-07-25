/**
 * DAG lock rule shared with the web workspace (process-stepper.tsx): a stage
 * is unlocked iff every incoming-link source stage is completed (no incoming
 * links = startable root; independent branches run in parallel). Falls back to
 * the old sequential-prefix rule for payloads without links.
 */
export interface LockableStage {
  id: string;
  status?: string;
  incomingLinks?: Array<{ fromStageId: string }>;
}

export function stageUnlocked(
  stages: LockableStage[],
  index: number,
): boolean {
  const stage = stages[index];
  if (!stage) return false;
  const hasLinks = stages.some((s) => s.incomingLinks !== undefined);
  if (!hasLinks) {
    const firstIncomplete = stages.findIndex((s) => s.status !== "completed");
    const currentIndex =
      firstIncomplete === -1 ? stages.length : firstIncomplete;
    return index <= currentIndex;
  }
  const completedIds = new Set(
    stages.filter((s) => s.status === "completed").map((s) => s.id),
  );
  return (stage.incomingLinks ?? []).every((l) =>
    completedIds.has(l.fromStageId),
  );
}
