import type { ReactNode } from "react";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { Control, FieldValues } from "react-hook-form";

import { FormScreen } from "@/components/refine-ui/form-screen";

/**
 * Generic create/edit scaffold: wires Refine useForm to the FormScreen and
 * hands the RHF `control` to a render prop for the field set. Keeps per-resource
 * create/edit screens to a few lines.
 */
export function ResourceForm({
  resource,
  action,
  id,
  title,
  submitLabel,
  defaultValues,
  redirect = "list",
  onSuccess,
  children,
}: {
  resource: string;
  action: "create" | "edit";
  id?: string;
  title: string;
  submitLabel?: string;
  defaultValues?: FieldValues;
  redirect?: "list" | "show" | false;
  onSuccess?: () => void;
  children: (control: Control<FieldValues>) => ReactNode;
}) {
  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading },
  } = useForm<BaseRecord, HttpError, FieldValues>({
    refineCoreProps: {
      resource,
      action,
      id,
      redirect,
      onMutationSuccess: onSuccess ? () => onSuccess() : undefined,
    },
    defaultValues,
  });

  return (
    <FormScreen
      title={title}
      submitLabel={submitLabel ?? (action === "create" ? "Create" : "Save")}
      submitting={formLoading}
      onSubmit={handleSubmit((values) => onFinish(values))}
    >
      {children(control)}
    </FormScreen>
  );
}
