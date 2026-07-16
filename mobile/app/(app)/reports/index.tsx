import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { type BaseRecord, useList } from "@refinedev/core";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { format as formatDate } from "date-fns";
import { Download, Eye, FileCog, Pencil, Play, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { Can } from "@/components/can";
import { confirm } from "@/components/refine-ui/confirm";
import { SectionLabel } from "@/components/refine-ui/field-row";
import { Screen } from "@/components/refine-ui/screen";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { FORMAT_OPTIONS } from "@/components/report/report-constants";
import { downloadAndShare } from "@/lib/download";
import { labelWarehouse } from "@/lib/labels";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

type ParamType =
  | "project"
  | "order"
  | "warehouse"
  | "location"
  | "user"
  | "date"
  | "text";

interface ParamDef {
  name: string;
  label: string;
  type: ParamType;
  required: boolean;
}
interface DataSourceInfo {
  key: string;
  label: string;
  params: ParamDef[];
}
interface ReportDef extends BaseRecord {
  id: string;
  key: string;
  name: string;
  description?: string;
  dataSource: string;
  recipe: string;
  isActive?: boolean;
}
interface HistoryRecord {
  id: string;
  definitionName: string;
  format: string;
  fileName: string;
  createdAt: string;
}

const REL: Record<
  string,
  { resource: string; label: (i: BaseRecord) => string }
> = {
  project: {
    resource: "projects",
    label: (i) => [i.code, i.name].filter(Boolean).join(" · "),
  },
  order: {
    resource: "orders",
    label: (i) => `${i.orderNumber}${i.name ? ` · ${i.name}` : ""}`,
  },
  warehouse: { resource: "warehouses", label: labelWarehouse },
  location: {
    resource: "locations",
    label: (i) => [i.code, i.name ?? i.id].filter(Boolean).join(" · "),
  },
  user: {
    resource: "users",
    label: (i) => `${i.name ?? i.id}${i.email ? ` · ${i.email}` : ""}`,
  },
};

function RelationParam({
  field,
  value,
  onChange,
}: {
  field: ParamDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const rel = REL[field.type];
  const { result } = useList<BaseRecord>({
    resource: rel.resource,
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const options: SelectOption[] = (result?.data ?? []).map((i) => ({
    label: rel.label(i),
    value: String(i.id),
  }));
  return (
    <SearchableSelect
      value={value || null}
      onChange={(v) => onChange(v ?? "")}
      options={options}
      placeholder={`Select ${field.label.toLowerCase()}`}
    />
  );
}

function ParamField({
  field,
  value,
  onChange,
}: {
  field: ParamDef;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="gap-1.5">
      <View className="flex-row">
        <Label>{field.label}</Label>
        {field.required ? <Text className="text-destructive"> *</Text> : null}
      </View>
      {field.type === "date" ? (
        <Input
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />
      ) : field.type === "text" ? (
        <Input value={value} onChangeText={onChange} />
      ) : (
        <RelationParam field={field} value={value} onChange={onChange} />
      )}
    </View>
  );
}

export default function ReportCenterScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [format, setFormat] = useState("pdf");
  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [generating, setGenerating] = useState(false);

  const renameRef = useRef<BottomSheetModal>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { result } = useList<ReportDef>({
    resource: "report-definitions",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const definitions = (result?.data ?? []).filter((d) => d.isActive !== false);
  const selected = definitions.find((d) => d.id === selectedId);
  const activeSource = dataSources.find((d) => d.key === selected?.dataSource);
  const paramFields = activeSource?.params ?? [];

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get<HistoryRecord[]>(
        "/reports/history",
        { params: { _start: 0, _end: 12, _sort: "createdAt", _order: "desc" } },
      );
      setHistory(data ?? []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    axiosInstance
      .get<DataSourceInfo[]>("/reports/data-sources")
      .then((r) => setDataSources(r.data ?? []))
      .catch(() => setDataSources([]));
    loadHistory();
  }, [loadHistory]);

  const onSelect = (id: string | null) => {
    setSelectedId(id);
    setParams({});
    const def = definitions.find((d) => d.id === id);
    setFormat(def?.recipe === "html-to-xlsx" ? "xlsx" : "pdf");
  };

  const generate = async () => {
    if (!selected) return;
    const missing = paramFields
      .filter((f) => f.required && !params[f.name])
      .map((f) => f.label);
    if (missing.length) {
      toast.error(`Missing: ${missing.join(", ")}`);
      return;
    }
    setGenerating(true);
    try {
      await downloadAndShare({
        url: `/reports/${selected.id}/render?format=${format}`,
        method: "post",
        body: { parameters: params },
        fallbackName: `${selected.key}.${format}`,
      });
      toast.success("Report generated");
      loadHistory();
    } catch {
      toast.error("Could not generate report");
    } finally {
      setGenerating(false);
    }
  };

  const downloadHistory = async (rec: HistoryRecord) => {
    try {
      await downloadAndShare({
        url: `/reports/history/${rec.id}/download`,
        fallbackName: rec.fileName,
      });
    } catch {
      toast.error("Download failed");
    }
  };

  const deleteHistory = (rec: HistoryRecord) =>
    confirm({
      title: "Delete report?",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/reports/history/${rec.id}`);
          loadHistory();
        } catch {
          toast.error("Delete failed");
        }
      },
    });

  const openRename = (rec: HistoryRecord) => {
    setRenameId(rec.id);
    setRenameValue(rec.fileName.replace(/\.[^.]+$/, ""));
    renameRef.current?.present();
  };

  const saveRename = async () => {
    if (!renameId) return;
    try {
      await axiosInstance.patch(`/reports/history/${renameId}`, {
        fileName: renameValue.trim(),
      });
      renameRef.current?.dismiss();
      setRenameId(null);
      loadHistory();
    } catch {
      toast.error("Rename failed");
    }
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

  return (
    <Screen
      title="Report Center"
      tabBar
      headerRight={
        <Can resource="report-definitions" action="list">
          <Pressable
            onPress={() => router.push("/reports/templates")}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-md active:bg-accent"
          >
            <Icon icon={FileCog} color={colors.foreground} />
          </Pressable>
        </Can>
      }
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="rounded-lg border border-border bg-card p-4">
          <SectionLabel>Generate</SectionLabel>
          <View className="mt-2 gap-4">
            <View className="gap-1.5">
              <Label>Report</Label>
              <SearchableSelect
                value={selectedId}
                onChange={onSelect}
                options={definitions.map((d) => ({ label: d.name, value: d.id }))}
                placeholder="Select a report"
              />
            </View>
            {selected?.description ? (
              <Text className="text-xs text-muted-foreground">
                {selected.description}
              </Text>
            ) : null}

            {paramFields.map((f) => (
              <ParamField
                key={f.name}
                field={f}
                value={params[f.name] ?? ""}
                onChange={(v) => setParams((p) => ({ ...p, [f.name]: v }))}
              />
            ))}

            {selected ? (
              <View className="gap-1.5">
                <Label>Format</Label>
                <SearchableSelect
                  value={format}
                  onChange={(v) => setFormat(v ?? "pdf")}
                  options={FORMAT_OPTIONS}
                  searchable={false}
                />
              </View>
            ) : null}

            <Can resource="reports" action="create">
              <Button
                label="Generate & share"
                loading={generating}
                disabled={!selected}
                leftIcon={<Icon icon={Play} size={16} color={colors.primaryForeground} />}
                onPress={generate}
              />
            </Can>
          </View>
        </View>

        <View className="overflow-hidden rounded-lg border border-border bg-card">
          <View className="border-b border-border p-3">
            <Text className="font-sans-semibold text-sm text-card-foreground">
              Recent reports
            </Text>
          </View>
          {history.length === 0 ? (
            <Text className="p-3 text-sm text-muted-foreground">
              No generated reports yet.
            </Text>
          ) : (
            history.map((rec, i) => (
              <View
                key={rec.id}
                className={i > 0 ? "border-t border-border p-3" : "p-3"}
              >
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-1">
                    <Text
                      className="font-sans-medium text-sm text-foreground"
                      numberOfLines={1}
                    >
                      {rec.fileName}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {rec.definitionName} ·{" "}
                      {formatDate(new Date(rec.createdAt), "dd MMM HH:mm")}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/viewer?url=${encodeURIComponent(`/reports/history/${rec.id}/download`)}&name=${encodeURIComponent(rec.fileName)}`,
                        )
                      }
                      hitSlop={6}
                      className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                    >
                      <Icon icon={Eye} size={16} color={colors.foreground} />
                    </Pressable>
                    <Pressable
                      onPress={() => downloadHistory(rec)}
                      hitSlop={6}
                      className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                    >
                      <Icon icon={Download} size={16} color={colors.foreground} />
                    </Pressable>
                    <Pressable
                      onPress={() => openRename(rec)}
                      hitSlop={6}
                      className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                    >
                      <Icon icon={Pencil} size={16} color={colors.mutedForeground} />
                    </Pressable>
                    <Pressable
                      onPress={() => deleteHistory(rec)}
                      hitSlop={6}
                      className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
                    >
                      <Icon icon={Trash2} size={16} color={colors.destructive} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <BottomSheetModal
        ref={renameRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
      >
        <BottomSheetView>
          <SafeAreaView edges={["bottom"]}>
            <View className="gap-3 p-4">
              <Text className="font-sans-semibold text-base text-foreground">
                Rename report
              </Text>
              <BottomSheetTextInput
                value={renameValue}
                onChangeText={setRenameValue}
                style={{
                  borderWidth: 1,
                  borderColor: colors.input,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.foreground,
                  fontSize: 16,
                }}
              />
              <Button label="Save" onPress={saveRename} />
            </View>
          </SafeAreaView>
        </BottomSheetView>
      </BottomSheetModal>
    </Screen>
  );
}
