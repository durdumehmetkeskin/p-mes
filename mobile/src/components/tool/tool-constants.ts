export const TOOL_CATEGORIES = [
  { value: "mold", label: "Mold (Kalıp)" },
  { value: "fixture", label: "Fixture (Fikstür)" },
  { value: "apparatus", label: "Apparatus (Aparat)" },
  { value: "cutting_tool", label: "Cutting Tool (Kesici Takım)" },
  { value: "measurement_equipment", label: "Measurement Equipment (Ölçüm Ekipmanı)" },
] as const;

// Material-style two-state lifecycle (mirrors backend ToolStatus).
export const TOOL_STATUSES = [
  { value: "available", label: "Available" },
  { value: "in_use", label: "In use" },
] as const;

export const toolCategoryLabel = (v?: string) =>
  TOOL_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? "—";

export const toolStatusLabel = (v?: string) =>
  TOOL_STATUSES.find((s) => s.value === v)?.label ?? v ?? "—";
