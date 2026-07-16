/**
 * Shared chart colors + segment builders so the data-source aggregates and the
 * report templates speak the same visual language. A "segment" is one slice of
 * a donut / one category in a legend: { label, value, color }.
 */
export interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

export const COLOR = {
  completed: '#16a34a',
  inProgress: '#f59e0b',
  pending: '#94a3b8',
  ok: '#16a34a',
  low: '#dc2626',
  neutral: '#94a3b8',
  accent: '#2563eb',
} as const;

/** Stage/process status distribution (pending/in_progress/completed). */
export function STAGE_STATUS_SEGMENTS(
  completed: number,
  inProgress: number,
  pending: number,
): ChartSegment[] {
  return [
    { label: 'Tamamlandı', value: completed, color: COLOR.completed },
    { label: 'Devam Ediyor', value: inProgress, color: COLOR.inProgress },
    { label: 'Bekliyor', value: pending, color: COLOR.pending },
  ];
}

/** A rotating palette for arbitrary categorical charts (e.g. per-user bars). */
export const PALETTE = [
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
  '#ea580c',
  '#0d9488',
];

export function paletteColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}
