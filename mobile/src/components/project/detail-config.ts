// The old per-detailType field configs were removed with the generic-only
// stage types; only the shared status formatter remains.

/** snake_case / kebab -> Title Case for display of free-form statuses. */
export function humanizeStatus(s?: string): string {
  if (!s) return "—";
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
