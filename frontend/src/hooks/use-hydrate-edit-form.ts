import { useEffect } from "react";
import type {
  FieldValues,
  UseFormGetValues,
  UseFormReset,
} from "react-hook-form";

/**
 * Populate a Refine edit form from its fetched record.
 *
 * Refine v5's `useForm` hydrates the form field-by-field via `setValue`, which a
 * `<Controller defaultValue={…}>` can defeat on (re-)registration — so `Select`
 * dropdowns render blank even though the record loaded. An explicit `reset`
 * fixes it authoritatively.
 *
 * Two subtleties this handles:
 *  1. The reset is scoped to the form's OWN registered fields (keys from
 *     `getValues()`), so read-only columns / relation objects / dropped fields
 *     (id, createdAt, materialType, a lot's derived `status`, …) are not folded
 *     into the form and resubmitted — the API's `forbidNonWhitelisted` rejects
 *     those on save.
 *  2. It resets both immediately AND on the next macrotask. On the *first* open
 *     the record loads async (every field already mounted, so the immediate pass
 *     fills it); on a *re-open* React Query serves the record synchronously from
 *     cache, before every `<Controller>` has re-registered — so the deferred pass
 *     (after registration + Refine's own microtask hydration) catches those.
 *     Whichever pass runs with the complete field set wins; the other is a no-op.
 */
export function useHydrateEditForm<T extends FieldValues>(
  record: T | undefined | null,
  reset: UseFormReset<T>,
  getValues: UseFormGetValues<T>,
): void {
  useEffect(() => {
    if (!record) return;
    const source = record as Record<string, unknown>;

    const apply = () => {
      const next: Record<string, unknown> = {};
      for (const key of Object.keys(getValues())) {
        if (key in source) next[key] = source[key];
      }
      reset(next as T, { keepDefaultValues: false });
    };

    apply();
    const timer = setTimeout(apply, 0);
    return () => clearTimeout(timer);
  }, [record, reset, getValues]);
}
