import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGo } from "@refinedev/core";
import { ChevronLeft, ShieldAlert } from "lucide-react";

/**
 * Shown when the authenticated user navigates to an area they lack permission
 * for (the 403 page). Sidebar entries for these areas are hidden too, so this
 * mostly catches direct URL navigation / stale links.
 */
export function Forbidden() {
  const go = useGo();

  return (
    <div
      className={cn(
        "flex",
        "flex-1",
        "items-center",
        "justify-center",
        "bg-background",
        "my-auto"
      )}
    >
      <div className={cn("text-center", "space-y-8")}>
        <div className={cn("flex", "justify-center")}>
          <ShieldAlert className={cn("h-20", "w-20", "text-muted-foreground")} />
        </div>

        <div className={cn("space-y-4")}>
          <h1 className={cn("text-2xl", "font-semibold", "text-foreground")}>
            403 — Erişim izniniz yok
          </h1>
          <p className={cn("text-muted-foreground")}>
            Bu sayfayı görüntüleme yetkiniz bulunmuyor. Erişim gerekiyorsa
            yöneticinizle iletişime geçin.
          </p>
        </div>

        <Button
          onClick={() => go({ to: "/" })}
          className={cn("flex", "items-center", "gap-2", "mx-auto")}
        >
          <ChevronLeft className={cn("h-4", "w-4")} />
          Panoya dön
        </Button>
      </div>
    </div>
  );
}

Forbidden.displayName = "Forbidden";
