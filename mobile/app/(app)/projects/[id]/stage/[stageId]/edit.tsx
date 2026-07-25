import { useState } from "react";
import { Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useOne } from "@refinedev/core";
import { type FieldValues, useForm } from "react-hook-form";
import { useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "sonner-native";

import {
  CheckboxGroupField,
  NumberField,
  TextAreaField,
  TextField,
} from "@/components/refine-ui/form";
import { FormScreen } from "@/components/refine-ui/form-screen";
import { useTeamMembers } from "@/components/project/use-team-members";
import { Skeleton } from "@/components/ui/skeleton";
import { showApiError } from "@/components/ui/error-alert";
import { axiosInstance } from "@/providers/axios";

interface Stage extends BaseRecord {
  id: string;
  name?: string;
  note?: string;
  durationHours?: number;
  estimatedStartDate?: string;
  estimatedCompletedDate?: string;
  estimatedDurationHours?: number;
  workers?: Array<{ id: string; name?: string }>;
}
interface Process extends BaseRecord {
  id: string;
  stages?: Stage[];
}

/**
 * Edit screen for a stage's info fields — opened from the (view-only) stage
 * detail screen, mirroring the web StageEditDialog. Saves via
 * PATCH /process-stages/:id (relationship-authorized: process responsible or
 * admin; the backend 403s anyone else).
 */
export default function StageEditScreen() {
  const { id, stageId, processId } = useLocalSearchParams<{
    id: string;
    stageId: string;
    processId: string;
  }>();
  const router = useRouter();
  const invalidate = useInvalidate();
  const { query, result } = useOne<Process>({
    resource: "processes",
    id: processId,
    queryOptions: { enabled: !!processId, retry: false },
  });
  const stage = (result?.stages ?? []).find((s) => s.id === stageId);

  const { members } = useTeamMembers(id);
  // Worker candidates = project team, plus any already-assigned worker who has
  // since left the team (so they stay visible and can be unchecked).
  const workerOptions = [
    ...members.map((m) => ({ label: m.name ?? m.id, value: m.id })),
    ...(stage?.workers ?? [])
      .filter((w) => !members.some((m) => m.id === w.id))
      .map((w) => ({ label: w.name ?? w.id, value: w.id })),
  ];

  const [saving, setSaving] = useState(false);
  const { control, handleSubmit } = useForm<FieldValues>({
    values: {
      name: stage?.name ?? "",
      durationHours: stage?.durationHours,
      note: stage?.note ?? "",
      estimatedStartDate: stage?.estimatedStartDate ?? "",
      estimatedCompletedDate: stage?.estimatedCompletedDate ?? "",
      estimatedDurationHours: stage?.estimatedDurationHours,
      workerIds: (stage?.workers ?? []).map((w) => w.id),
    },
  });

  const save = handleSubmit(async (v) => {
    setSaving(true);
    try {
      await axiosInstance.patch(`/process-stages/${stageId}`, {
        name: v.name,
        note: v.note || undefined,
        durationHours:
          typeof v.durationHours === "number" ? v.durationHours : undefined,
        estimatedStartDate: v.estimatedStartDate || undefined,
        estimatedCompletedDate: v.estimatedCompletedDate || undefined,
        estimatedDurationHours:
          typeof v.estimatedDurationHours === "number"
            ? v.estimatedDurationHours
            : undefined,
        workerIds: Array.isArray(v.workerIds) ? v.workerIds : undefined,
      });
      invalidate({
        resource: "processes",
        invalidates: ["detail"],
        id: processId,
      });
      invalidate({ resource: "processes", invalidates: ["list"] });
      toast.success("Stage saved");
      if (router.canGoBack()) router.back();
    } catch (err) {
      showApiError(err, "Aşama kaydedilemedi");
    } finally {
      setSaving(false);
    }
  });

  return (
    <FormScreen
      title={stage?.name ? `Edit stage · ${stage.name}` : "Edit stage"}
      submitting={saving}
      onSubmit={save}
    >
      {query.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !stage ? (
        <Text className="text-sm text-muted-foreground">Stage not found.</Text>
      ) : (
        <View className="gap-4">
          <TextField control={control} name="name" label="Name" />
          <NumberField
            control={control}
            name="durationHours"
            label="Duration (h)"
          />
          <TextAreaField control={control} name="note" label="Note" />
          <TextField
            control={control}
            name="estimatedStartDate"
            label="Est. start"
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
          <TextField
            control={control}
            name="estimatedCompletedDate"
            label="Est. completion"
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
          <NumberField
            control={control}
            name="estimatedDurationHours"
            label="Est. duration (h)"
          />
          <CheckboxGroupField
            control={control}
            name="workerIds"
            label="Workers (team)"
            hint={
              workerOptions.length === 0
                ? "Önce proje ekibine kullanıcı ekleyin."
                : undefined
            }
            options={workerOptions}
          />
        </View>
      )}
    </FormScreen>
  );
}
