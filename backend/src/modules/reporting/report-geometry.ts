/**
 * Pure geometry builders shared by the detailed report data sources. They turn
 * raw series / date-range rows into precomputed SVG + bar coordinates so the
 * Handlebars templates only have to drop strings into attributes — no charting
 * helper has to reach across an {{#each}} scope (the same reason the bar charts
 * precompute their width in the data source). Everything renders in chrome-pdf
 * with no external assets.
 */

export interface SeriesPoint {
  t: number; // epoch ms
  avg: number | null;
  min: number | null;
  max: number | null;
}

export interface SeriesChart {
  hasData: boolean;
  pointCount: number;
  color: string;
  // viewBox / layout (units == px at ~full content width, so scaling is ~1:1).
  w: number;
  h: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  linePath: string; // polyline "x,y x,y …" of the average
  bandPath: string; // polygon of the min/max envelope (empty when no band)
  yTicks: Array<{ y: number; label: string }>;
  xTicks: Array<{ x: number; label: string }>;
  min: number | null;
  avg: number | null;
  max: number | null;
}

const CHART_W = 700;
const CHART_H = 230;
const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 26;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Map a temperature/humidity bucket series to a single-metric point list. */
export function seriesPoints(
  buckets: Array<{
    t: number;
    tempAvg: number | null;
    tempMin: number | null;
    tempMax: number | null;
    humidityAvg: number | null;
    humidityMin: number | null;
    humidityMax: number | null;
  }>,
  metric: 'temp' | 'humidity',
): SeriesPoint[] {
  return buckets.map((b) =>
    metric === 'temp'
      ? { t: b.t, avg: b.tempAvg, min: b.tempMin, max: b.tempMax }
      : { t: b.t, avg: b.humidityAvg, min: b.humidityMin, max: b.humidityMax },
  );
}

/** "Nice" rounded [min,max] padded a little so the line never touches the edge. */
function niceBounds(lo: number, hi: number): [number, number] {
  if (!isFinite(lo) || !isFinite(hi)) return [0, 1];
  if (lo === hi) {
    const pad = Math.abs(lo) > 1 ? Math.abs(lo) * 0.1 : 1;
    return [lo - pad, hi + pad];
  }
  const span = hi - lo;
  const pad = span * 0.08;
  return [lo - pad, hi + pad];
}

function fmtTime(ms: number, spanMs: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  const day = `${p(d.getDate())}.${p(d.getMonth() + 1)}`;
  // Below ~3 days show the clock; above it the date is enough.
  if (spanMs <= 3 * 86400_000)
    return `${day} ${p(d.getHours())}:${p(d.getMinutes())}`;
  return day;
}

/**
 * Build a single-metric line chart (avg line + min/max band) from a bucket
 * series. Returns precomputed SVG path strings + axis ticks.
 */
export function buildSeriesChart(
  points: SeriesPoint[],
  color: string,
): SeriesChart {
  const base: SeriesChart = {
    hasData: false,
    pointCount: 0,
    color,
    w: CHART_W,
    h: CHART_H,
    plotLeft: PAD_L,
    plotRight: CHART_W - PAD_R,
    plotTop: PAD_T,
    plotBottom: CHART_H - PAD_B,
    linePath: '',
    bandPath: '',
    yTicks: [],
    xTicks: [],
    min: null,
    avg: null,
    max: null,
  };

  const valid = points.filter((p) => p.avg !== null && isFinite(Number(p.avg)));
  if (valid.length === 0) return base;

  const innerW = base.plotRight - base.plotLeft;
  const innerH = base.plotBottom - base.plotTop;

  const t0 = valid[0].t;
  const t1 = valid[valid.length - 1].t;
  const tSpan = Math.max(1, t1 - t0);

  let dataLo = Infinity;
  let dataHi = -Infinity;
  let sum = 0;
  for (const p of valid) {
    const a = Number(p.avg);
    sum += a;
    dataLo = Math.min(dataLo, p.min !== null ? Number(p.min) : a);
    dataHi = Math.max(dataHi, p.max !== null ? Number(p.max) : a);
  }
  const [yLo, yHi] = niceBounds(dataLo, dataHi);
  const ySpan = yHi - yLo || 1;

  const x = (t: number) =>
    valid.length === 1
      ? base.plotLeft + innerW / 2
      : base.plotLeft + ((t - t0) / tSpan) * innerW;
  const y = (v: number) => base.plotBottom - ((v - yLo) / ySpan) * innerH;

  const linePts = valid.map(
    (p) => `${round1(x(p.t))},${round1(y(Number(p.avg)))}`,
  );

  // Min/max envelope: forward along max, back along min.
  const hasBand = valid.some((p) => p.min !== null && p.max !== null);
  let bandPath = '';
  if (hasBand) {
    const top = valid.map(
      (p) => `${round1(x(p.t))},${round1(y(Number(p.max ?? p.avg)))}`,
    );
    const bottom = valid
      .slice()
      .reverse()
      .map((p) => `${round1(x(p.t))},${round1(y(Number(p.min ?? p.avg)))}`);
    bandPath = [...top, ...bottom].join(' ');
  }

  const yTicks = [0, 1, 2, 3, 4].map((i) => {
    const v = yLo + (ySpan * i) / 4;
    return {
      y: round1(base.plotBottom - (innerH * i) / 4),
      label: `${round1(v)}`,
    };
  });

  const tickCount = Math.min(6, valid.length);
  const xTicks: Array<{ x: number; label: string }> = [];
  for (let i = 0; i < tickCount; i++) {
    const t = tickCount === 1 ? t0 : t0 + (tSpan * i) / (tickCount - 1);
    xTicks.push({ x: round1(x(t)), label: fmtTime(t, tSpan) });
  }

  return {
    ...base,
    hasData: true,
    pointCount: valid.length,
    linePath: linePts.join(' '),
    bandPath,
    yTicks,
    xTicks,
    min: round1(dataLo),
    max: round1(dataHi),
    avg: round1(sum / valid.length),
  };
}

// ---- Timeline / Gantt geometry -------------------------------------------

export interface TimelineInput {
  id: string;
  label: string;
  sublabel?: string | null;
  start: string | Date | null;
  end: string | Date | null;
  color: string;
  meta?: Record<string, unknown>;
}

export interface TimelineItem extends TimelineInput {
  leftPct: number;
  widthPct: number;
  visible: boolean;
}

export interface Timeline {
  hasData: boolean;
  windowStart: number;
  windowEnd: number;
  windowStartLabel: string;
  windowEndLabel: string;
  items: TimelineItem[];
  ticks: Array<{ leftPct: number; label: string }>;
  // Rows dropped past the display cap (set by capTimeline); 0 when all shown.
  overflow: number;
}

/** Cap the visible Gantt rows (keeps the window/ticks); records the remainder. */
export function capTimeline(timeline: Timeline, max = 40): Timeline {
  const overflow = Math.max(0, timeline.items.length - max);
  return { ...timeline, items: timeline.items.slice(0, max), overflow };
}

/**
 * Extend a date-only ('YYYY-MM-DD') bound to the end of that day so a half-open
 * `recorded_at < to` query (LocationDataService.getSeries) includes the whole
 * day. Timestamps and undefined pass through unchanged.
 */
export function endOfDayIso(v: string | null | undefined): string | undefined {
  if (v == null) return undefined;
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T23:59:59.999` : s;
}

/** Parse a date-only string as local midnight, or a timestamp as-is. */
function toMs(v: string | Date | null, endOfDay = false): number | null {
  if (v == null) return null;
  if (v instanceof Date) return v.getTime();
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(
      y,
      m - 1,
      d,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
    ).getTime();
  }
  const ms = new Date(s).getTime();
  return isNaN(ms) ? null : ms;
}

function fmtDay(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}`;
}

/**
 * Lay out date-range rows on a [windowStart, windowEnd] axis as percentages.
 * If the window is not given it is derived from the items (padded by a day).
 */
export function buildTimeline(
  rows: TimelineInput[],
  windowStartIn?: string | Date | null,
  windowEndIn?: string | Date | null,
): Timeline {
  let ws = toMs(windowStartIn ?? null);
  let we = toMs(windowEndIn ?? null, true);

  const starts = rows
    .map((r) => toMs(r.start))
    .filter((n): n is number => n !== null);
  const ends = rows
    .map((r) => toMs(r.end, true))
    .filter((n): n is number => n !== null);

  if (ws === null) {
    ws = starts.length ? Math.min(...starts) : Date.now() - 15 * 86400_000;
  }
  if (we === null) {
    we = ends.length ? Math.max(...ends) : ws + 30 * 86400_000;
  }
  if (!(we > ws)) we = ws + 86400_000;
  const span = we - ws;

  const items: TimelineItem[] = rows.map((r) => {
    const s = toMs(r.start);
    const e = toMs(r.end, true);
    if (s === null && e === null) {
      return { ...r, leftPct: 0, widthPct: 0, visible: false };
    }
    const a = Math.max(ws, s ?? (e as number));
    const b = Math.min(we, e ?? (s as number));
    const left = ((a - ws) / span) * 100;
    let width = ((b - a) / span) * 100;
    if (width < 0.8) width = 0.8; // keep single-day bars visible
    const clampedLeft = Math.max(0, Math.min(100, left));
    const clampedWidth = Math.max(0, Math.min(100 - clampedLeft, width));
    return {
      ...r,
      leftPct: round1(clampedLeft),
      widthPct: round1(clampedWidth),
      visible: b >= ws && a <= we,
    };
  });

  // ~8 evenly spaced day ticks across the window.
  const tickCount = 8;
  const ticks: Array<{ leftPct: number; label: string }> = [];
  for (let i = 0; i <= tickCount; i++) {
    const ms = ws + (span * i) / tickCount;
    ticks.push({ leftPct: round1((i / tickCount) * 100), label: fmtDay(ms) });
  }

  return {
    hasData: rows.length > 0,
    windowStart: ws,
    windowEnd: we,
    windowStartLabel: fmtDay(ws),
    windowEndLabel: fmtDay(we),
    items,
    ticks,
    overflow: 0,
  };
}

function dayFloor(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function activeRanges(
  rows: Array<{ start: string | Date | null; end: string | Date | null }>,
): Array<{ s: number; e: number }> {
  return rows
    .map((r) => ({ s: toMs(r.start), e: toMs(r.end, true) }))
    .filter((r) => r.s !== null || r.e !== null)
    .map((r) => ({ s: (r.s ?? r.e) as number, e: (r.e ?? r.s) as number }));
}

/**
 * Occupancy cells that ALWAYS span the full [windowStart, windowEnd] window (so
 * the strip's ends line up with the window labels). One cell per day when the
 * window fits in `maxCells`; otherwise the window is split into `maxCells`
 * equal multi-day buckets whose value is the peak daily count inside the bucket.
 */
export function dailyOccupancy(
  rows: Array<{ start: string | Date | null; end: string | Date | null }>,
  windowStart: number,
  windowEnd: number,
  maxCells = 62,
): Array<{ label: string; value: number; pct: number }> {
  const dayMs = 86400_000;
  const startDay = dayFloor(windowStart);
  const endDay = dayFloor(windowEnd);
  const totalDays = Math.max(1, Math.round((endDay - startDay) / dayMs) + 1);
  const ranges = activeRanges(rows);
  const dayCount = (d0: number) => {
    const d1 = d0 + dayMs;
    let c = 0;
    for (const r of ranges) if (r.s < d1 && r.e >= d0) c += 1;
    return c;
  };

  const cells: Array<{ label: string; value: number; pct: number }> = [];
  let maxCount = 0;
  if (totalDays <= maxCells) {
    for (let i = 0; i < totalDays; i++) {
      const d0 = startDay + i * dayMs;
      const v = dayCount(d0);
      maxCount = Math.max(maxCount, v);
      cells.push({ label: fmtDay(d0), value: v, pct: 0 });
    }
  } else {
    const daysPerCell = Math.ceil(totalDays / maxCells);
    for (let c = 0; c * daysPerCell < totalDays; c++) {
      const base = startDay + c * daysPerCell * dayMs;
      let peak = 0;
      for (let k = 0; k < daysPerCell && c * daysPerCell + k < totalDays; k++) {
        peak = Math.max(peak, dayCount(base + k * dayMs));
      }
      maxCount = Math.max(maxCount, peak);
      cells.push({ label: fmtDay(base), value: peak, pct: 0 });
    }
  }
  for (const c of cells) c.pct = maxCount > 0 ? (c.value / maxCount) * 100 : 0;
  return cells;
}

/** Distinct days with at least one active row, at full day resolution. */
export function busyDayCount(
  rows: Array<{ start: string | Date | null; end: string | Date | null }>,
  windowStart: number,
  windowEnd: number,
  maxScan = 1100,
): number {
  const dayMs = 86400_000;
  const startDay = dayFloor(windowStart);
  const endDay = dayFloor(windowEnd);
  const totalDays = Math.min(
    maxScan,
    Math.max(1, Math.round((endDay - startDay) / dayMs) + 1),
  );
  const ranges = activeRanges(rows);
  let busy = 0;
  for (let i = 0; i < totalDays; i++) {
    const d0 = startDay + i * dayMs;
    const d1 = d0 + dayMs;
    if (ranges.some((r) => r.s < d1 && r.e >= d0)) busy += 1;
  }
  return busy;
}
