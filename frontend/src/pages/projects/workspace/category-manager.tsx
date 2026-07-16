import { useCreate, useUpdate } from "@refinedev/core";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CategoryRecord {
  id: string;
  code: string;
  name: string;
  color: string | null;
  sortOrder: number;
  projectId: string | null;
}

type FormValues = {
  code: string;
  name: string;
  color: string;
  sortOrder: number;
};

function defaultsFor(record?: CategoryRecord): FormValues {
  return {
    code: record?.code ?? "",
    name: record?.name ?? "",
    color: record?.color ?? "",
    sortOrder: record?.sortOrder ?? 0,
  };
}

/** Create/edit dialog for a stage-type category. */
export function CategoryDialog({
  record,
  projectId,
  trigger,
  onSaved,
}: {
  record?: CategoryRecord;
  projectId: string;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const isEdit = Boolean(record);
  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: defaultsFor(record) });

  const submit = (values: FormValues) =>
    new Promise<void>((resolve) => {
      const payload = {
        code: values.code,
        name: values.name,
        color: values.color || undefined,
        sortOrder: Number(values.sortOrder) || 0,
        // Scope new entries to this project; never re-scope on edit.
        ...(isEdit ? {} : { projectId }),
      };
      const opts = {
        onSuccess: () => {
          onSaved();
          setOpen(false);
          resolve();
        },
        onError: () => resolve(),
      };
      if (isEdit && record) {
        update(
          { resource: "stage-type-categories", id: record.id, values: payload },
          opts,
        );
      } else {
        create({ resource: "stage-type-categories", values: payload }, opts);
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset(defaultsFor(record));
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-code">Code</Label>
              <Input
                id="cat-code"
                placeholder="quality"
                {...register("code", { required: "Code is required" })}
              />
              {errors.code && (
                <span className="text-sm text-destructive">
                  {errors.code.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <span className="text-sm text-destructive">
                  {errors.name.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-color">Color (optional)</Label>
              <Input id="cat-color" placeholder="#22c55e" {...register("color")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-order">Sort order</Label>
              <Input
                id="cat-order"
                type="number"
                {...register("sortOrder", { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
