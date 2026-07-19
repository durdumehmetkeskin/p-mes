import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useOne } from "@refinedev/core";
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GripVertical, Plus, Trash2 } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

interface TplStage {
  key: string;
  name: string;
}

export default function WorkflowBuilderScreen() {
  const { id, editId } = useLocalSearchParams<{ id: string; editId?: string }>();
  const router = useRouter();
  const invalidate = useInvalidate();
  const isEdit = !!editId;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stages, setStages] = useState<TplStage[]>([]);
  const [saving, setSaving] = useState(false);

  const { result: tplRes } = useOne<BaseRecord>({
    resource: "workflow-templates",
    id: editId,
    queryOptions: { enabled: isEdit, retry: false },
  });

  useEffect(() => {
    const t = tplRes;
    if (isEdit && t) {
      setName(String(t.name ?? ""));
      setDescription(String(t.description ?? ""));
      setStages(
        ((t.stages as BaseRecord[]) ?? []).map((s, i) => ({
          key: `${s.id ?? i}`,
          name: String(s.name ?? "Stage"),
        })),
      );
    }
  }, [isEdit, tplRes]);

  const [newStage, setNewStage] = useState("");
  const addStage = () => {
    const stageName = newStage.trim();
    if (!stageName) return;
    setNewStage("");
    setStages((prev) => [
      ...prev,
      { key: `s-${Date.now()}-${prev.length}`, name: stageName },
    ]);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {
      name: name.trim(),
      description: description || undefined,
      stages: stages.map((s) => ({ name: s.name })),
    };
    if (!isEdit) body.projectId = id;
    try {
      if (isEdit) await axiosInstance.patch(`/workflow-templates/${editId}`, body);
      else await axiosInstance.post("/workflow-templates", body);
      invalidate({ resource: "workflow-templates", invalidates: ["list"] });
      toast.success(isEdit ? "Template saved" : "Template created");
      if (router.canGoBack()) router.back();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<TplStage>) => (
    <ScaleDecorator>
      <View
        className={`mx-4 mb-2 flex-row items-center gap-2 rounded-lg border border-border p-3 ${isActive ? "bg-accent" : "bg-card"}`}
      >
        <Pressable onLongPress={drag} hitSlop={8}>
          <Icon icon={GripVertical} size={18} color={colors.mutedForeground} />
        </Pressable>
        <Text className="flex-1 text-sm text-foreground">{item.name}</Text>
        <Pressable
          onPress={() =>
            setStages((prev) => prev.filter((_, i) => i !== getIndex()))
          }
          hitSlop={8}
        >
          <Icon icon={Trash2} size={16} color={colors.destructive} />
        </Pressable>
      </View>
    </ScaleDecorator>
  );

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="flex-row items-center justify-between gap-2 border-b border-border px-3 py-2">
          <Pressable onPress={() => router.canGoBack() && router.back()} hitSlop={8} className="h-9 justify-center px-1">
            <Text className="text-sm text-primary">Cancel</Text>
          </Pressable>
          <Text className="flex-1 text-center font-sans-semibold text-base text-foreground">
            {isEdit ? "Edit template" : "New template"}
          </Text>
          <Button size="sm" label="Save" loading={saving} onPress={save} />
        </View>
      </SafeAreaView>

      <View className="gap-3 p-4">
        <View className="gap-1.5">
          <Label>Name</Label>
          <Input value={name} onChangeText={setName} placeholder="Template name" />
        </View>
        <View className="gap-1.5">
          <Label>Description</Label>
          <Input value={description} onChangeText={setDescription} />
        </View>
        <View className="gap-1.5">
          <Text className="text-[11px] font-sans-semibold uppercase tracking-wider text-muted-foreground">
            Stages ({stages.length})
          </Text>
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <Input
                value={newStage}
                onChangeText={setNewStage}
                placeholder="New stage name…"
                onSubmitEditing={addStage}
                returnKeyType="done"
              />
            </View>
            <Pressable
              onPress={addStage}
              disabled={!newStage.trim()}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-md border border-border active:bg-accent"
            >
              <Icon icon={Plus} size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      </View>

      <DraggableFlatList
        data={stages}
        keyExtractor={(s) => s.key}
        onDragEnd={({ data }) => setStages(data)}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text className="px-4 text-sm text-muted-foreground">
            Add stages, then long-press to reorder.
          </Text>
        }
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </View>
  );
}
