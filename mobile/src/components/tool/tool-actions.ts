import { useInvalidate } from "@refinedev/core";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { showApiError } from "@/components/ui/error-alert";

export const TOOL_INVALIDATE = ["tools", "tool-status-history"];

/**
 * Runs a tool action (axios call), invalidates the tool detail + history lists,
 * toasts, and pops back. Used by the tool action modal screens.
 */
export function useToolAction(id: string) {
  const invalidate = useInvalidate();
  const router = useRouter();

  return async (fn: () => Promise<unknown>, successMsg: string) => {
    try {
      await fn();
      TOOL_INVALIDATE.forEach((r) =>
        invalidate({ resource: r, invalidates: ["list"] }),
      );
      invalidate({ resource: "tools", invalidates: ["detail"], id });
      toast.success(successMsg);
      if (router.canGoBack()) router.back();
    } catch (e) {
      showApiError(e, "Araç işlemi başarısız");
    }
  };
}
