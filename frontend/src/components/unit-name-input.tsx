import { useRef } from "react";

import { Input } from "@/components/ui/input";

// Unicode maps for exponent / index digits.
const SUP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  "+": "⁺",
};
const SUB: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};
const SUP_CHARS = new Set(Object.values(SUP));
const SUB_CHARS = new Set(Object.values(SUB));

// Palette rows shown under the input.
const PALETTE: Array<{ title: string; chars: string[] }> = [
  { title: "Superscript", chars: [...Object.values(SUP)] },
  { title: "Subscript", chars: [...Object.values(SUB)] },
  {
    title: "Symbols",
    chars: ["·", "°", "µ", "Ω", "%", "‰", "½", "⅓", "⅔", "¼", "¾"],
  },
];

/**
 * Turn typing shortcuts into unit notation: `*` → `·`, `^` starts a
 * superscript run and `_` a subscript run; digits typed right after a
 * super/subscript character continue the run (so `m^-12` → `m⁻¹²`,
 * `CO_2` → `CO₂`, `N*m` → `N·m`, `kg/m^3` → `kg/m³`).
 */
export function formatUnitText(input: string): string {
  let out = "";
  let mode: "sup" | "sub" | null = null;
  for (const ch of input) {
    if (ch === "*") {
      out += "·";
      mode = null;
      continue;
    }
    if (ch === "^") {
      mode = "sup";
      continue;
    }
    if (ch === "_") {
      mode = "sub";
      continue;
    }
    if (mode === "sup" && ch in SUP) {
      out += SUP[ch];
      continue;
    }
    if (mode === "sub" && ch in SUB) {
      out += SUB[ch];
      continue;
    }
    // Continue an existing run: a digit right after a super/subscript char.
    if (ch in SUB) {
      const last = out.slice(-1);
      if (SUP_CHARS.has(last)) {
        out += SUP[ch];
        continue;
      }
      if (SUB_CHARS.has(last)) {
        out += SUB[ch];
        continue;
      }
    }
    mode = null;
    out += ch;
  }
  return out;
}

interface UnitNameInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Name input for units of measure: a character palette (exponents, indices,
 * multiplication dot, fractions) plus typing shortcuts via `formatUnitText`,
 * so notations like m², kg/m³, N·m, s⁻¹ or CO₂ are easy to write. The value
 * stays a plain Unicode string — no markup, renders everywhere as-is.
 */
export function UnitNameInput({
  id,
  value,
  onChange,
  placeholder,
}: UnitNameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const raw = el.value;
    const formatted = formatUnitText(raw);
    if (formatted !== raw) {
      // Shortcut chars before the caret were consumed — pull the caret back.
      const pos = (el.selectionStart ?? raw.length) - (raw.length - formatted.length);
      requestAnimationFrame(() => el.setSelectionRange(pos, pos));
    }
    onChange(formatted);
  };

  const insert = (ch: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + ch + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + ch.length, start + ch.length);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        id={id}
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
      />
      {PALETTE.map((row) => (
        <div key={row.title} className="flex flex-wrap gap-1" title={row.title}>
          {row.chars.map((ch) => (
            <button
              key={ch}
              type="button"
              // Palette buttons must not steal the submit; insert at the caret.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(ch)}
              className="flex h-6 min-w-6 items-center justify-center rounded-md border border-input px-1 text-xs hover:bg-accent hover:text-accent-foreground"
            >
              {ch}
            </button>
          ))}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Shortcuts: <span className="font-mono">^2</span> → ²,{" "}
        <span className="font-mono">_2</span> → ₂,{" "}
        <span className="font-mono">*</span> → · (e.g.{" "}
        <span className="font-mono">kg/m^3</span> → kg/m³)
      </p>
    </div>
  );
}
