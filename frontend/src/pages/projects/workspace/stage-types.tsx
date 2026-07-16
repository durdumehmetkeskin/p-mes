import {
  useCreate,
  useDelete,
  useInvalidate,
  useList,
  useUpdate,
} from "@refinedev/core";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useOutletContext } from "react-router";
import type { CategoryRecord } from "./category-manager";
import type { ProjectContext } from "./project-workspace";
interface StageTypeRow {
  id: string;
  code: string;
  name: string;
  category: { id: string; code: string; name: string; color: string | null } | null;
  defaultInput: string | null;
  defaultOutput: string | null;
  isActive: boolean;
  projectId: string | null;
}

type FormValues = {
  code: string;
  name: string;
  categoryId: string;
  defaultInput: string;
  defaultOutput: string;
  isActive: boolean;
};

function defaultsFor(record?: StageTypeRow): FormValues {
  return {
    code: record?.code ?? "",
    name: record?.name ?? "",
    categoryId: record?.category?.id ?? "",
    defaultInput: record?.defaultInput ?? "",
    defaultOutput: record?.defaultOutput ?? "",
    isActive: record?.isActive ?? true,
  };
}

function StageTypeDialog({
  record,
  categories,
  projectId,
  trigger,
}: {
  record?: StageTypeRow;
  categories: CategoryRecord[];
  projectId: string;
  trigger: React.ReactNode;
}) {
  const isEdit = Boolean(record);
  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: defaultsFor(record) });

  const done = () => {
    invalidate({ resource: "stage-types", invalidates: ["list"] });
    setOpen(false);
  };

  const submit = (values: FormValues) =>
    new Promise<void>((resolve) => {
      const payload = {
        ...values,
        defaultInput: values.defaultInput || undefined,
        defaultOutput: values.defaultOutput || undefined,
        // Scope new entries to this project; never re-scope on edit.
        ...(isEdit ? {} : { projectId }),
      };
      const opts = {
        onSuccess: () => {
          done();
          resolve();
        },
        onError: () => resolve(),
      };
      if (isEdit && record) {
        update({ resource: "stage-types", id: record.id, values: payload }, opts);
      } else {
        create({ resource: "stage-types", values: payload }, opts);
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit stage type" : "New stage type"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="BOM"
                {...register("code", { required: "Code is required" })}
              />
              {errors.code && (
                <span className="text-sm text-destructive">
                  {errors.code.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <span className="text-sm text-destructive">
                  {errors.name.message}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <Controller
              name="categoryId"
              control={control}
              rules={{ required: "Category is required" }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <span className="text-sm text-destructive">
                {errors.categoryId.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="defaultInput">Default input</Label>
              <Input id="defaultInput" {...register("defaultInput")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="defaultOutput">Default output</Label>
              <Input id="defaultOutput" {...register("defaultOutput")} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label>Active</Label>
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

export const ProjectStageTypes = () => {
  const { projectId } = useOutletContext<ProjectContext>();
  const { mutate: remove } = useDelete();
  const invalidate = useInvalidate();
  const projectFilter = [
    { field: "projectId", operator: "eq" as const, value: projectId },
  ];
  const { result } = useList<StageTypeRow>({
    resource: "stage-types",
    filters: projectFilter,
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(projectId) },
  });
  const rows = result?.data ?? [];

  const { result: catResult } = useList<CategoryRecord>({
    resource: "stage-type-categories",
    filters: projectFilter,
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(projectId) },
  });
  const categories = catResult?.data ?? [];

  const onDelete = (id: string) =>
    remove(
      { resource: "stage-types", id },
      {
        onSuccess: () =>
          invalidate({ resource: "stage-types", invalidates: ["list"] }),
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Stage type library</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal text-muted-foreground">
              {rows.length} total
            </span>
            <StageTypeDialog
              categories={categories}
              projectId={projectId}
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 h-4 w-4" />
                  New stage type
                </Button>
              }
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Code</th>
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium">Scope</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const owned = s.projectId === projectId;
              return (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-2">{s.code}</td>
                  <td className="py-2">{s.name}</td>
                  <td className="py-2">
                    <Badge variant="outline">{s.category?.name ?? "—"}</Badge>
                  </td>
                  <td className="py-2">
                    {owned ? (
                      <Badge variant="secondary">project</Badge>
                    ) : (
                      <Badge variant="outline">global</Badge>
                    )}
                  </td>
                  <td className="py-2">
                    <div className="flex justify-end gap-2">
                      {owned ? (
                        <>
                          <StageTypeDialog
                            record={s}
                            categories={categories}
                            projectId={projectId}
                            trigger={
                              <Button size="icon" variant="outline">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => onDelete(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
