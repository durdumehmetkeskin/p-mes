export const DATASOURCE_OPTIONS = [
  { label: "Project production", value: "project-production" },
  { label: "Work order", value: "work-order" },
  { label: "Workload", value: "workload" },
  { label: "Inventory & tooling", value: "inventory-tooling" },
];

export const RECIPE_OPTIONS = [
  { label: "PDF", value: "chrome-pdf" },
  { label: "Excel", value: "html-to-xlsx" },
  { label: "Word", value: "html-embedded-in-docx" },
];

export const RECIPE_LABEL: Record<string, string> = {
  "chrome-pdf": "PDF",
  "html-to-xlsx": "Excel",
  "html-embedded-in-docx": "Word",
};

/** Render-time output format (distinct vocabulary from `recipe`). */
export const FORMAT_OPTIONS = [
  { label: "PDF", value: "pdf" },
  { label: "Excel (xlsx)", value: "xlsx" },
  { label: "Word (docx)", value: "docx" },
];
