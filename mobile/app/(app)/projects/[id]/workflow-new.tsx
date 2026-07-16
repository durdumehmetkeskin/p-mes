import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useList, useOne } from "@refinedev/core";
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GripVertical, Plus, Trash2 } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

interface TplStage {
  key: string;
  stageTypeId: string;
  name: string;
}

export default function WorkflowBuilderScreen() {
  const { id, editId } = useLocalSearchParams<{ id: string; editId?: string }>();
  const router = useRouter();
  const invalidate = useInvalidate();
  const isEdit = !!editId;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [stages, setStages] = useState<TplStage[]>([]);
  const [saving, setSaving] = useState(false);

  const { result: catRes } = useList<BaseRecord>({
    resource: "stage-type-categories",
    filters: [{ field: "projectId", operator: "eq", value: id }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const { result: stRes } = useList<BaseRecord>({
    resource: "stage-types",
    filters: categoryId
      ? [{ field: "categoryId", operator: "eq", value: categoryId }]
      : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!categoryId, retry: false },
    errorNotification: false,
  });

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
      setCategoryId((t.categoryId as string) ?? null);
      setStages(
        ((t.stages as BaseRecord[]) ?? []).map((s, i) => ({
          key: `${s.id ?? i}`,
          stageTypeId: String(s.stageTypeId ?? s.stageType?.id ?? ""),
          name: String(s.name ?? s.stageType?.name ?? "Stage"),
        })),
      );
    }
  }, [isEdit, tplRes]);

  const addStage = (st: BaseRecord) =>
    setStages((prev) => [
      ...prev,
      { key: `${st.id}-${Date.now()}`, stageTypeId: String(st.id), name: String(st.name) },
    ]);

  const save = async () => {
    if (!name.trim() || !categoryId) {
      toast.error("Name and category are required");
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {
      name: name.trim(),
      description: description || undefined,
      categoryId,
      stages: stages.map((s) => ({ stageTypeId: s.stageTypeId, name: s.name })),
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
          <Label>Category</Label>
          <SearchableSelect
            value={categoryId}
            onChange={(v) => {
              setCategoryId(v);
              setStages([]);
            }}
            options={(catRes?.data ?? []).map((c) => ({
              label: String(c.name),
              value: String(c.id),
            }))}
            placeholder="Select category"
          />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] font-sans-semibold uppercase tracking-wider text-muted-foreground">
            Stages ({stages.length})
          </Text>
          {categoryId ? (
            <ActionMenu
              title="Add stage"
              options={(stRes?.data ?? []).map((st) => ({
                label: String(st.name),
                onPress: () => addStage(st),
              }))}
              trigger={(open) => (
                <Pressable onPress={open} hitSlop={8} className="h-8 w-8 items-center justify-center rounded-md active:bg-accent">
                  <Icon icon={Plus} size={18} color={colors.foreground} />
                </Pressable>
              )}
            />
          ) : null}
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
