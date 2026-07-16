"use client";

import { useBack } from "@refinedev/core";
import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Wraps a create/edit form in a modal that is driven by the route. The list
 * screen stays mounted underneath (via its <Outlet/>), so on success Refine
 * navigates back to the list, the modal unmounts and the user continues where
 * they left off. Closing the modal (X / overlay / Esc) navigates back too.
 */
export function RouteFormDialog({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const back = useBack();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) back();
      }}
    >
      {/* Keep the base mobile width cap; only widen from `sm` up (the plain
          `max-w-2xl` would override the mobile calc() cap and overflow). */}
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
