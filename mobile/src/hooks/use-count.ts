import { type CrudFilter, useList } from "@refinedev/core";

/** Lightweight total-count for KPI tiles (fetches a single row, reads total). */
export function useCount(
  resource: string,
  filters?: CrudFilter[],
): number | undefined {
  const { result } = useList({
    resource,
    pagination: { pageSize: 1 },
    filters,
    errorNotification: false,
    queryOptions: { retry: false },
  });
  return result.total;
}
