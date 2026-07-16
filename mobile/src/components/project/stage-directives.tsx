import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { toast } from "sonner-native";

import { SectionLabel } from "@/components/refine-ui/field-row";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

/**
 * Work directives for the stage. Written ONLY by the process responsible or
 * an admin (backend-enforced via PUT /process-stages/:id/directives); every
 * other project member sees them read-only.
 */
export function StageDirectives({
  stageId,
  directives,
  canEdit,
  onChanged,
}: {
  stageId: string;
  directives?: string | null;
  /** Admin or the process's responsible user. */
  canEdit: boolean;
  onChanged?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await axiosInstance.put(`/process-stages/${stageId}/directives`, {
        directives: draft.trim() || null,
      });
      setEditing(false);
      toast.success("Directives saved");
      onChanged?.();
    } catch {
      toast.error("Could not save directives");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-2 rounded-lg border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <SectionLabel>Directives</SectionLabel>
        {canEdit && !editing ? (
          <Pressable
            onPress={() => {
              setDraft(directives ?? "");
              setEditing(true);
            }}
            hitSlop={6}
          >
            <Text className="text-xs text-primary">
              {directives ? "Edit" : "Add"}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {editing ? (
        <View className="gap-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            numberOfLines={5}
            placeholder="Work directives for this stage…"
            placeholderTextColor={colors.mutedForeground}
            className="min-h-[96px] rounded-md border border-border bg-background p-3 text-sm text-foreground"
            style={{ textAlignVertical: "top" }}
          />
          <View className="flex-row justify-end gap-2">
            <Button
              label="Cancel"
              size="sm"
              variant="outline"
              disabled={busy}
              onPress={() => setEditing(false)}
            />
            <Button label="Save" size="sm" loading={busy} onPress={save} />
          </View>
        </View>
      ) : directives ? (
        <Text className="text-sm text-foreground">{directives}</Text>
      ) : (
        <Text className="text-xs text-muted-foreground">
          No directives for this stage yet.
          {canEdit ? "" : " Only the process responsible or an admin can add them."}
        </Text>
      )}
    </View>
  );
}
