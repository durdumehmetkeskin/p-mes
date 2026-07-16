import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type BaseRecord, useInvalidate, useOne } from "@refinedev/core";
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GripVertical } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

interface Stage extends BaseRecord {
  id: string;
  name?: string;
  sequence?: number;
}
interface Process extends BaseRecord {
  id: string;
  stages?: Stage[];
}

export default function ReorderStagesScreen() {
  const { processId } = useLocalSearchParams<{ processId: string }>();
  const router = useRouter();
  const invalidate = useInvalidate();
  const { result } = useOne<Process>({
    resource: "processes",
    id: processId,
    queryOptions: { enabled: !!processId, retry: false },
  });
  const [items, setItems] = useState<Stage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = result?.stages;
    if (s) setItems([...s].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)));
  }, [result?.stages]);

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.post(`/processes/${processId}/stages/reorder`, {
        stageIds: items.map((s) => s.id),
      });
      invalidate({ resource: "processes", invalidates: ["list", "detail"], id: processId });
      toast.success("Stages reordered");
      if (router.canGoBack()) router.back();
    } catch {
      toast.error("Reorder failed");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Stage>) => (
    <ScaleDecorator>
      <Pressable
        onLongPress={drag}
        disabled={isActive}
        className={`mx-4 mb-2 flex-row items-center gap-3 rounded-lg border border-border p-3 ${isActive ? "bg-accent" : "bg-card"}`}
      >
        <Icon icon={GripVertical} size={18} color={colors.mutedForeground} />
        <Text className="flex-1 text-sm text-foreground">{item.name}</Text>
      </Pressable>
    </ScaleDecorator>
  );

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="flex-row items-center justify-between gap-2 border-b border-border px-3 py-2">
          <Pressable
            onPress={() => router.canGoBack() && router.back()}
            hitSlop={8}
            className="h-9 justify-center px-1"
          >
            <Text className="text-sm text-primary">Cancel</Text>
          </Pressable>
          <Text className="flex-1 text-center font-sans-semibold text-base text-foreground">
            Reorder stages
          </Text>
          <Button size="sm" label="Save" loading={saving} onPress={save} />
        </View>
      </SafeAreaView>
      <Text className="px-4 py-2 text-xs text-muted-foreground">
        Long-press a stage and drag to reorder.
      </Text>
      <DraggableFlatList
        data={items}
        keyExtractor={(s) => s.id}
        onDragEnd={({ data }) => setItems(data)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </View>
  );
}
