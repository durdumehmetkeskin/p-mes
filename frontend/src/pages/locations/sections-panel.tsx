import {
  useCreate,
  useDelete,
  useInvalidate,
  useList,
  useUpdate,
} from "@refinedev/core";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Can } from "@/components/can";
import { ConfirmDelete } from "@/pages/projects/workspace/confirm-delete";

interface SectionRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

type FormValues = { code: string; name: string; description: string };

function SectionDialog({
  locationId,
  record,
  trigger,
  onSaved,
}: {
  locationId: string;
  record?: SectionRow;
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
  } = useForm<FormValues>({
    defaultValues: {
      code: record?.code ?? "",
      name: record?.name ?? "",
      description: record?.description ?? "",
    },
  });

  const submit = (values: FormValues) =>
    new Promise<void>((resolve) => {
      const payload = {
        ...values,
        description: values.description || undefined,
        ...(isEdit ? {} : { locationId }),
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
        update({ resource: "sections", id: record.id, values: payload }, opts);
      } else {
        create({ resource: "sections", values: payload }, opts);
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o)
          reset({
            code: record?.code ?? "",
            name: record?.name ?? "",
            description: record?.description ?? "",
          });
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit section" : "New section"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="s-code">Code</Label>
              <Input
                id="s-code"
                {...register("code", { required: "Code is required" })}
              />
              {errors.code && (
                <span className="text-sm text-destructive">
                  {errors.code.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="s-name">Name</Label>
              <Input
                id="s-name"
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
            <Label htmlFor="s-desc">Description</Label>
            <Input id="s-desc" {...register("description")} />
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

export function SectionsPanel({ locationId }: { locationId: string }) {
  const navigate = useNavigate();
  const { mutate: remove } = useDelete();
  const invalidate = useInvalidate();
  const { result } = useList<SectionRow>({
    resource: "sections",
    filters: [{ field: "locationId", operator: "eq", value: locationId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(locationId) },
  });
  const rows = result?.data ?? [];

  const refresh = () =>
    invalidate({ resource: "sections", invalidates: ["list"] });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Sections ({rows.length})</span>
          <Can perm="sections:create">
            <SectionDialog
              locationId={locationId}
              onSaved={refresh}
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 h-4 w-4" />
                  New section
                </Button>
              }
            />
          </Can>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Code</th>
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.id}
                  onClick={() =>
                    navigate(`/locations/${locationId}/sections/${s.id}`)
                  }
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="py-2">{s.code}</td>
                  <td className="py-2">{s.name}</td>
                  <td className="py-2">
                    <StatusBadge
                      tone={s.isActive ? "success" : "neutral"}
                      label={s.isActive ? "Active" : "Inactive"}
                    />
                  </td>
                  <td className="py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Can perm="sections:update">
                        <SectionDialog
                          locationId={locationId}
                          record={s}
                          onSaved={refresh}
                          trigger={
                            <Button size="icon" variant="outline">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </Can>
                      <Can perm="sections:delete">
                        <ConfirmDelete
                          title="Delete section?"
                          description={`"${s.name}" and its reservations will be removed.`}
                          onConfirm={() =>
                            remove(
                              { resource: "sections", id: s.id },
                              { onSuccess: refresh },
                            )
                          }
                          trigger={
                            <Button size="icon" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No sections yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
