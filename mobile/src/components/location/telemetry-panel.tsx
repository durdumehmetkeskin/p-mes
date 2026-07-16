import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Download, Trash2, Upload } from "lucide-react-native";
import { toast } from "sonner-native";

import { Can } from "@/components/can";
import { confirmDelete } from "@/components/refine-ui/confirm";
import { SectionLabel } from "@/components/refine-ui/field-row";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { downloadAndShare } from "@/lib/download";
import { axiosInstance } from "@/providers/axios";
import { colors } from "@/lib/theme";

interface SeriesBucket {
  t: number;
  count: number;
  tempAvg: number | null;
  tempMin: number | null;
  tempMax: number | null;
  humidityAvg: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
}
interface Summary {
  count: number;
  tempMin: number | null;
  tempMax: number | null;
  tempAvg: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
  humidityAvg: number | null;
}
interface DataFile {
  id: string;
  fileName?: string;
  readingCount?: number;
  createdAt?: string;
}

const RESOLUTIONS = [
  { label: "Auto", value: "auto" },
  { label: "1 min", value: "60" },
  { label: "5 min", value: "300" },
  { label: "15 min", value: "900" },
  { label: "1 hour", value: "3600" },
  { label: "1 day", value: "86400" },
];

type Preset = "latest" | "today" | "week" | "all";

function fmt(n: number | null | undefined, unit: string) {
  return n == null ? "—" : `${Number(n).toFixed(1)}${unit}`;
}

// victory-native pulls in @shopify/react-native-skia (native) — load lazily so
// Expo Go degrades to a message instead of crashing the location screen.
function loadVictory(): { CartesianChart: any; Line: any } | null {
  try {
    const v = require("victory-native");
    return { CartesianChart: v.CartesianChart, Line: v.Line };
  } catch {
    return null;
  }
}

function MiniChart({
  points,
  color,
}: {
  points: { t: number; v: number }[];
  color: string;
}) {
  const victory = useMemo(loadVictory, []);
  if (!victory) {
    return (
      <View className="h-[180px] items-center justify-center">
        <Text className="text-xs text-muted-foreground">
          Charts need a dev build
        </Text>
      </View>
    );
  }
  if (points.length < 2) {
    return (
      <View className="h-[180px] items-center justify-center">
        <Text className="text-xs text-muted-foreground">Not enough data</Text>
      </View>
    );
  }
  const { CartesianChart, Line } = victory;
  return (
    <View style={{ height: 180 }}>
      <CartesianChart data={points} xKey="t" yKeys={["v"]}>
        {({ points: p }: { points: { v: unknown } }) => (
          <Line points={p.v} color={color} strokeWidth={2} />
        )}
      </CartesianChart>
    </View>
  );
}

export function TelemetryPanel({ locationId }: { locationId: string }) {
  const [range, setRange] = useState<{ min: string | null; max: string | null }>({
    min: null,
    max: null,
  });
  const [preset, setPreset] = useState<Preset>("latest");
  const [resolution, setResolution] = useState("auto");
  const [series, setSeries] = useState<SeriesBucket[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [files, setFiles] = useState<DataFile[]>([]);
  const [tab, setTab] = useState<"chart" | "table">("chart");
  const [readings, setReadings] = useState<
    { id: string; recordedAt: string; temperature: number; humidity: number }[]
  >([]);
  const reqId = useRef(0);

  // Plain function (not memoized) so it never lands in loadSeries' dep array —
  // deriving the window from `range` identity used to trigger a redundant reload.
  const computeRange = (p: Preset): { from: Date; to: Date } => {
    const max = range.max ? new Date(range.max) : new Date();
    const min = range.min ? new Date(range.min) : new Date(max);
    if (p === "all") return { from: min, to: max };
    if (p === "today") {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      return { from, to: new Date() };
    }
    if (p === "week")
      return { from: new Date(max.getTime() - 7 * 86400000), to: max };
    const from = new Date(max);
    from.setHours(0, 0, 0, 0);
    return { from, to: max };
  };

  const loadMeta = useCallback(async () => {
    try {
      const [r, f] = await Promise.all([
        axiosInstance
          .get<{ min: string | null; max: string | null }>(
            `/locations/${locationId}/readings/range`,
          )
          .catch(() => ({ data: { min: null, max: null } })),
        axiosInstance
          .get<DataFile[]>(`/locations/${locationId}/data-files`)
          .catch(() => ({ data: [] as DataFile[] })),
      ]);
      setRange(r.data ?? { min: null, max: null });
      setFiles(f.data ?? []);
    } catch {
      /* ignore */
    }
  }, [locationId]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const loadSeries = useCallback(async () => {
    const { from, to } = computeRange(preset);
    const id = ++reqId.current;
    try {
      const params: Record<string, string> = {
        from: from.toISOString(),
        to: to.toISOString(),
      };
      if (resolution !== "auto") params.bucket = resolution;
      const { data } = await axiosInstance.get(
        `/locations/${locationId}/readings/series`,
        { params },
      );
      if (id !== reqId.current) return; // stale guard
      setSeries(data?.series ?? []);
      setSummary(data?.summary ?? null);

      const rr = await axiosInstance
        .get<{ readings: typeof readings }>(`/locations/${locationId}/readings`, {
          params: {
            startDate: from.toISOString().slice(0, 10),
            endDate: to.toISOString().slice(0, 10),
          },
        })
        .catch(() => ({ data: { readings: [] } }));
      if (id === reqId.current) setReadings(rr.data?.readings ?? []);
    } catch {
      if (id === reqId.current) {
        setSeries([]);
        setSummary(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, preset, resolution, range.min, range.max]);

  useEffect(() => {
    // Wait until the data extent is known for range-dependent presets so we
    // load the series exactly once (not once with a guessed window, then again).
    if (!range.max && preset !== "today") return;
    loadSeries();
  }, [loadSeries, range.max, preset]);

  const tempPoints = useMemo(
    () =>
      series
        .filter((b) => b.tempAvg != null)
        .map((b) => ({ t: b.t, v: b.tempAvg as number })),
    [series],
  );
  const humPoints = useMemo(
    () =>
      series
        .filter((b) => b.humidityAvg != null)
        .map((b) => ({ t: b.t, v: b.humidityAvg as number })),
    [series],
  );

  const upload = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
    });
    if (res.canceled) return;
    const a = res.assets[0];
    try {
      const form = new FormData();
      form.append("file", {
        uri: a.uri,
        name: a.name ?? "data.xlsx",
        type: a.mimeType ?? "application/vnd.ms-excel",
      } as unknown as Blob);
      await axiosInstance.post(`/locations/${locationId}/data`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Uploaded");
      await loadMeta();
      loadSeries();
    } catch {
      toast.error("Upload failed");
    }
  };

  const deleteFile = (f: DataFile) =>
    confirmDelete(f.fileName ?? "file", async () => {
      try {
        await axiosInstance.delete(`/location-data-files/${f.id}`);
        await loadMeta();
        loadSeries();
      } catch {
        toast.error("Delete failed");
      }
    });

  return (
    <View className="gap-4">
      {/* Controls */}
      <View className="gap-3 rounded-lg border border-border bg-card p-3">
        <View className="flex-row flex-wrap gap-2">
          {(["latest", "today", "week", "all"] as Preset[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPreset(p)}
              className={cn(
                "rounded-full border px-3 py-1.5",
                preset === p ? "border-primary bg-primary/15" : "border-border",
              )}
            >
              <Text
                className={cn(
                  "text-xs",
                  preset === p ? "font-sans-medium text-primary" : "text-muted-foreground",
                )}
              >
                {p === "latest" ? "Latest" : p === "today" ? "Today" : p === "week" ? "7 days" : "All"}
              </Text>
            </Pressable>
          ))}
        </View>
        <SearchableSelect
          value={resolution}
          onChange={(v) => setResolution(v ?? "auto")}
          options={RESOLUTIONS}
          searchable={false}
        />
      </View>

      {/* Summary */}
      <View className="rounded-lg border border-border bg-card p-4">
        <SectionLabel>Summary</SectionLabel>
        <View className="mt-1 flex-row justify-between">
          <Text className="text-xs text-muted-foreground">Readings</Text>
          <Text className="font-mono text-sm text-foreground">
            {summary?.count ?? 0}
          </Text>
        </View>
        <View className="mt-1 flex-row justify-between">
          <Text className="text-xs text-muted-foreground">Temp</Text>
          <Text className="font-mono text-sm text-foreground">
            {fmt(summary?.tempMin, "")}–{fmt(summary?.tempMax, "°C")} (avg{" "}
            {fmt(summary?.tempAvg, "°C")})
          </Text>
        </View>
        <View className="mt-1 flex-row justify-between">
          <Text className="text-xs text-muted-foreground">Humidity</Text>
          <Text className="font-mono text-sm text-foreground">
            {fmt(summary?.humidityMin, "")}–{fmt(summary?.humidityMax, "%")} (avg{" "}
            {fmt(summary?.humidityAvg, "%")})
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row gap-2">
        {(["chart", "table"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className={cn(
              "rounded-md border px-3 py-1.5",
              tab === t ? "border-primary bg-primary/15" : "border-border",
            )}
          >
            <Text className={cn("text-xs", tab === t ? "text-primary" : "text-muted-foreground")}>
              {t === "chart" ? "Chart" : "Table"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "chart" ? (
        <View className="gap-4">
          <View className="rounded-lg border border-border bg-card p-3">
            <Text className="mb-1 text-xs font-sans-medium text-destructive">
              Temperature °C
            </Text>
            <MiniChart points={tempPoints} color="#ef4444" />
          </View>
          <View className="rounded-lg border border-border bg-card p-3">
            <Text className="mb-1 text-xs font-sans-medium text-info">
              Humidity %RH
            </Text>
            <MiniChart points={humPoints} color="#3b82f6" />
          </View>
        </View>
      ) : (
        <View className="overflow-hidden rounded-lg border border-border bg-card">
          <View className="flex-row border-b border-border bg-muted/40 p-2">
            <Text className="flex-1 text-xs font-sans-semibold text-muted-foreground">Time</Text>
            <Text className="w-16 text-right text-xs font-sans-semibold text-muted-foreground">°C</Text>
            <Text className="w-16 text-right text-xs font-sans-semibold text-muted-foreground">%RH</Text>
          </View>
          {readings.slice(0, 100).map((r, i) => (
            <View key={r.id ?? i} className={i > 0 ? "flex-row border-t border-border p-2" : "flex-row p-2"}>
              <Text className="flex-1 text-xs text-foreground" numberOfLines={1}>
                {r.recordedAt}
              </Text>
              <Text className="w-16 text-right font-mono text-xs text-foreground">
                {r.temperature}
              </Text>
              <Text className="w-16 text-right font-mono text-xs text-foreground">
                {r.humidity}
              </Text>
            </View>
          ))}
          {readings.length === 0 ? (
            <Text className="p-3 text-sm text-muted-foreground">No readings</Text>
          ) : null}
        </View>
      )}

      {/* Files */}
      <View className="overflow-hidden rounded-lg border border-border bg-card">
        <View className="flex-row items-center justify-between border-b border-border p-3">
          <Text className="font-sans-semibold text-sm text-card-foreground">
            Data files ({files.length})
          </Text>
          <Can resource="location-data" action="create">
            <Pressable onPress={upload} hitSlop={8} className="h-8 w-8 items-center justify-center rounded-md active:bg-accent">
              <Icon icon={Upload} size={18} color={colors.foreground} />
            </Pressable>
          </Can>
        </View>
        {files.length === 0 ? (
          <Text className="p-3 text-sm text-muted-foreground">No files uploaded</Text>
        ) : (
          files.map((f, i) => (
            <View key={f.id} className={i > 0 ? "flex-row items-center gap-2 border-t border-border p-3" : "flex-row items-center gap-2 p-3"}>
              <View className="flex-1">
                <Text className="text-sm text-foreground" numberOfLines={1}>
                  {f.fileName}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {f.readingCount ?? 0} readings
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  downloadAndShare({
                    url: `/location-data-files/${f.id}/download`,
                    fallbackName: f.fileName ?? "data.xlsx",
                  }).catch(() => toast.error("Download failed"))
                }
                hitSlop={6}
                className="h-8 w-8 items-center justify-center rounded-md active:bg-accent"
              >
                <Icon icon={Download} size={16} color={colors.foreground} />
              </Pressable>
              <Can resource="location-data" action="delete">
                <Pressable onPress={() => deleteFile(f)} hitSlop={6} className="h-8 w-8 items-center justify-center rounded-md active:bg-accent">
                  <Icon icon={Trash2} size={16} color={colors.destructive} />
                </Pressable>
              </Can>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
