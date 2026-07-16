import type { NotificationProvider } from "@refinedev/core";
import { toast } from "sonner-native";

/**
 * Refine notificationProvider over sonner-native (the RN analogue of the web's
 * sonner). Handles success/error toasts and the undoable-delete "progress"
 * notification (re-opened with the same key each countdown tick, so sonner
 * updates one toast rather than stacking).
 */
export const notificationProvider: NotificationProvider = {
  open: ({ key, message, description, type, cancelMutation, undoableTimeout }) => {
    if (type === "progress") {
      toast(message, {
        id: key,
        description,
        duration: (undoableTimeout ?? 5) * 1000,
        action: cancelMutation
          ? { label: "Undo", onClick: () => cancelMutation() }
          : undefined,
      });
      return;
    }

    const opts = { id: key, description };
    if (type === "success") {
      toast.success(message, opts);
    } else if (type === "error") {
      toast.error(message, opts);
    } else {
      toast(message, opts);
    }
  },
  close: (key) => {
    toast.dismiss(key);
  },
};
