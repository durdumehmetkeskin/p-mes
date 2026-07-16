import { useNotification } from "@refinedev/core";
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
import { axiosInstance } from "@/providers/axios";

type FormValues = { reorderLevel: number };

/**
 * Set (or clear, when 0) a project's reorder level for a material. Posts to
 * `/project-material-reorders`; calls `onSaved` so the caller can refresh.
 */
export function ReorderDialog({
  projectId,
  materialId,
  materialLabel,
  current,
  onSaved,
  trigger,
}: {
  projectId: string;
  materialId: string;
  materialLabel: string;
  current: number | null;
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const { open } = useNotification();
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: { reorderLevel: current ?? 0 } });

  const submit = async (values: FormValues) => {
    try {
      await axiosInstance.post("/project-material-reorders", {
        projectId,
        materialId,
        reorderLevel: values.reorderLevel,
      });
      open?.({ type: "success", message: "Reorder level saved" });
      setDialogOpen(false);
      onSaved();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Could not save reorder level";
      open?.({ type: "error", message: msg });
    }
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(o) => {
        setDialogOpen(o);
        if (o) reset({ reorderLevel: current ?? 0 });
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reorder level</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-5">
          <div className="flex flex-col gap-2">
            <Label>Material</Label>
            <Input value={materialLabel} disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reorderLevel">Reorder level (this project)</Label>
            <Input
              id="reorderLevel"
              type="number"
              step="0.001"
              min="0"
              {...register("reorderLevel", { valueAsNumber: true, min: 0 })}
            />
            <span className="text-xs text-muted-foreground">
              Set 0 to clear the threshold.
            </span>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
