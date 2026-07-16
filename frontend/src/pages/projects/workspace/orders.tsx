import { useCreate, useInvalidate, useList } from "@refinedev/core";
import { Plus } from "lucide-react";
import { useState } from "react";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { useForm } from "react-hook-form";
import { Link, useOutletContext } from "react-router";

import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OrderFormFields } from "../../orders/order-form-fields";
import type { ProjectContext } from "./project-workspace";

type FormValues = Record<string, unknown>;

interface OrderRow {
  id: string;
  orderNumber: string;
  name: string | null;
  dueDate: string | null;
  status: string | null;
}

function clean(values: FormValues): FormValues {
  const p = { ...values };
  if (!p.dueDate) delete p.dueDate;
  return p;
}

function NewOrderDialog({ projectId }: { projectId: string }) {
  const { mutate } = useCreate();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { projectId } });

  const submit = (values: FormValues) =>
    new Promise<void>((resolve) => {
      mutate(
        { resource: "orders", values: clean(values) },
        {
          onSuccess: () => {
            invalidate({ resource: "orders", invalidates: ["list"] });
            setOpen(false);
            reset({ projectId });
            resolve();
          },
          onError: () => resolve(),
        },
      );
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset({ projectId });
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          New order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-6">
          <OrderFormFields
            register={register as unknown as UseFormRegister<FormValues>}
            control={control as unknown as Control<FormValues>}
            errors={errors as FieldErrors<FormValues>}
            lockProject
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const ProjectOrders = () => {
  const { projectId } = useOutletContext<ProjectContext>();

  const { result } = useList<OrderRow>({
    resource: "orders",
    filters: [{ field: "projectId", operator: "eq", value: projectId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(projectId) },
  });
  const rows = result?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Orders</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-normal text-muted-foreground">
              {rows.length} total
            </span>
            <NewOrderDialog projectId={projectId} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Order #</th>
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Due</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr
                  key={o.id}
                  className="border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="py-2">
                    <Link
                      to={`/projects/${projectId}/orders/${o.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-2">{o.name ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">
                    {o.dueDate ?? "—"}
                  </td>
                  <td className="py-2">
                    {o.status ? (
                      <StatusBadge label={String(o.status).replace(/_/g, " ")} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">
            No orders yet. Create one to start its planning/production workflow.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
