/**
 * Built-in Handlebars helpers made available to every report template. This is
 * a STRING of JS (not live functions): jsreport serialises it into the render
 * worker where it is evaluated. A definition's own `helpers` is appended after
 * these, so reports can add or override helpers.
 */
export const COMMON_REPORT_HELPERS = `
function formatDate(value) {
  if (!value) return '';
  var d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('tr-TR');
}
function formatDateTime(value) {
  if (!value) return '';
  var d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString('tr-TR');
}
function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  var n = Number(value);
  if (isNaN(n)) return String(value);
  return n.toLocaleString('tr-TR');
}
function percent(value) {
  if (value === null || value === undefined || value === '') return '';
  var n = Number(value);
  if (isNaN(n)) return String(value);
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + '%';
}
function eq(a, b) { return a === b; }
function gt(a, b) { return Number(a) > Number(b); }
function or(a, b) { return a || b; }
function defaultTo(value, fallback) {
  return (value === null || value === undefined || value === '') ? fallback : value;
}
// Tiny arithmetic helpers used to position SVG axis labels relative to a
// precomputed chart coordinate (e.g. {{add y 3}}, {{sub plotLeft 6}}).
function add(a, b) { return Number(a) + Number(b); }
function sub(a, b) { return Number(a) - Number(b); }

// ---- charting / theming helpers (self-contained; no cross-calls) ----

// Build a CSS conic-gradient from [{value,color}] for a donut chart. Used in a
// style attribute via {{{conicGradient segments}}}.
function conicGradient(segments) {
  if (!segments || !segments.length) return '#e5e7eb';
  var total = 0, i;
  for (i = 0; i < segments.length; i++) total += Number(segments[i].value) || 0;
  if (total <= 0) return '#e5e7eb';
  var acc = 0, parts = [];
  for (i = 0; i < segments.length; i++) {
    var v = Number(segments[i].value) || 0;
    var start = (acc / total) * 100;
    acc += v;
    var end = (acc / total) * 100;
    parts.push(segments[i].color + ' ' + start.toFixed(2) + '% ' + end.toFixed(2) + '%');
  }
  return 'conic-gradient(' + parts.join(', ') + ')';
}

// CSS width string for a bar: barWidth(value, max) → "73.0%" (clamped 0..100).
function barWidth(value, max) {
  var m = Number(max) || 0, v = Number(value) || 0;
  if (m <= 0) return '0%';
  var p = (v / m) * 100;
  if (p > 100) p = 100;
  if (p < 0) p = 0;
  return p.toFixed(1) + '%';
}

// Traffic-light color for a 0..100 percentage (low=red, mid=amber, high=green).
function barColor(value) {
  var v = Number(value) || 0;
  if (v >= 80) return '#16a34a';
  if (v >= 40) return '#f59e0b';
  return '#dc2626';
}

function statusLabel(s) {
  var m = { completed: 'Tamamlandı', in_progress: 'Devam Ediyor', pending: 'Bekliyor', draft: 'Taslak' };
  return m[s] || s || '-';
}

function statusColor(s) {
  var m = { completed: '#16a34a', in_progress: '#f59e0b', pending: '#94a3b8', draft: '#94a3b8' };
  return m[s] || '#64748b';
}

// A colored status pill (raw HTML — use with {{{statusBadge status}}}).
function statusBadge(s) {
  var cm = { completed: '#16a34a', in_progress: '#f59e0b', pending: '#94a3b8', draft: '#94a3b8' };
  var lm = { completed: 'Tamamlandı', in_progress: 'Devam Ediyor', pending: 'Bekliyor', draft: 'Taslak' };
  var c = cm[s] || '#64748b';
  var l = lm[s] || s || '-';
  return '<span style="display:inline-block;padding:1px 9px;border-radius:999px;font-size:10px;font-weight:600;color:#fff;white-space:nowrap;background:' + c + '">' + l + '</span>';
}

function sumValues(arr) {
  var t = 0;
  if (arr) for (var i = 0; i < arr.length; i++) t += Number(arr[i].value) || 0;
  return t;
}
`;

/** Combine the built-in helpers with a definition's optional extra helpers. */
export function mergeHelpers(extra?: string | null): string {
  return extra && extra.trim().length > 0
    ? `${COMMON_REPORT_HELPERS}\n${extra}`
    : COMMON_REPORT_HELPERS;
}
