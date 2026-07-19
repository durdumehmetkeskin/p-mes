import { Eye, Pencil, QrCode } from "lucide-react";

import { EditButton } from "@/components/refine-ui/buttons/edit";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/refine-ui/status-badge";
import { QrCodeDialog } from "@/components/qr/qr-code-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toolCategoryLabel, toolStatusLabel } from "./tool-form-fields";

export interface ToolRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  status: string;
  toolType: { id: string; name: string } | null;
  rack: {
    code: string;
    zone?: { code?: string; warehouse?: { code?: string } | null } | null;
  } | null;
  quantity: number;
  isActive: boolean;
}

// Tool status → tone + left accent (green = on the rack, blue = checked out).
const HEALTH: Record<string, { tone: StatusTone; accent: string }> = {
  available: { tone: "success", accent: "border-l-success" },
  in_use: { tone: "info", accent: "border-l-info" },
};

/** Map a tool status to its health tone (available = healthy, etc.). */
export function toolHealthTone(status: string): StatusTone {
  return HEALTH[status]?.tone ?? "neutral";
}

export function ToolCard({ tool }: { tool: ToolRecord }) {
  const health = HEALTH[tool.status] ?? { tone: "neutral", accent: "border-l-border" };

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-l-4 bg-card p-4 transition-colors hover:border-primary/60",
        health.accent,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-mono text-xs text-primary">{tool.code}</span>
          <h4 className="mt-0.5 truncate text-base font-semibold text-foreground">
            {tool.name}
          </h4>
        </div>
        <StatusBadge tone={health.tone} label={toolStatusLabel(tool.status)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Category
          </span>
          <span className="truncate">{toolCategoryLabel(tool.category)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Quantity
          </span>
          <span className="font-mono">{tool.quantity}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Location
          </span>
          <span className="truncate font-mono text-muted-foreground">
            {tool.rack
              ? [
                  tool.rack.zone?.warehouse?.code,
                  tool.rack.zone?.code,
                  tool.rack.code,
                ]
                  .filter(Boolean)
                  .join(" / ")
              : "—"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <ShowButton
          size="sm"
          variant="outline"
          recordItemId={tool.id}
          className="flex-1"
        >
          <Eye className="mr-1 h-4 w-4" />
          Inspect
        </ShowButton>
        <EditButton size="sm" variant="outline" recordItemId={tool.id}>
          <Pencil className="h-4 w-4" />
        </EditButton>
        <QrCodeDialog
          resource="tools"
          id={tool.id}
          code={tool.code}
          title={tool.name}
          trigger={
            <Button size="sm" variant="outline" title="QR code">
              <QrCode className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
