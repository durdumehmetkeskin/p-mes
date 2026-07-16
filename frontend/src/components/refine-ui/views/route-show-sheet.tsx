"use client";

import { useBack, useResourceParams } from "@refinedev/core";
import type { ReactNode } from "react";

import { EditButton } from "@/components/refine-ui/buttons/edit";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Wraps a show/detail screen in a route-driven side Sheet. The list screen
 * stays mounted underneath (via its <Outlet/>), so closing the sheet
 * (X / overlay / Esc) navigates back and the user continues where they left
 * off — mirroring the create/edit modal behaviour.
 */
export function RouteShowSheet({
  title,
  children,
  canEdit = true,
}: {
  title: ReactNode;
  children: ReactNode;
  canEdit?: boolean;
}) {
  const back = useBack();
  const { id } = useResourceParams();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) back();
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl"
      >
        <SheetHeader className="flex-row items-center justify-between gap-2 border-b pr-12">
          <SheetTitle className="text-xl">{title}</SheetTitle>
          {canEdit && (
            <EditButton variant="outline" size="sm" recordItemId={id} />
          )}
        </SheetHeader>
        <div className="flex flex-col gap-4 p-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
