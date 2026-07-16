import type { AxiosError } from "axios";
import { useInvalidate } from "@refinedev/core";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

export const TOOL_INVALIDATE = [
  "tools",
  "tool-status-history",
  "tool-assignments",
  "tool-usages",
  "tool-cycle-logs",
];

export function toolErr(e: unknown): string {
  const m = (e as AxiosError<{ message?: string | string[] }>)?.response?.data
    ?.message;
  if (Array.isArray(m)) return m.join(", ");
  return m ?? "Action failed";
}

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
      toast.error(toolErr(e));
    }
  };
}
