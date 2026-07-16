import { Download, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Can } from "@/components/can";
import { axiosInstance } from "@/providers/axios";
import { ConfirmDelete } from "@/pages/projects/workspace/confirm-delete";

const p2 = (n: number) => String(n).padStart(2, "0");

/** Day-first datetime: gün.ay.yıl saat:dakika:saniye (e.g. 07.10.2020 17:04:01). */
function fmtDateTime(value: string | number | Date | null): string {
  if (value == null) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()} ${p2(
    d.getHours(),
  )}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

/** X-axis tick label, granularity chosen by the effective bucket size. */
function tickFormat(t: number, bucketSeconds: number): string {
  const d = new Date(t);
  if (bucketSeconds < 60)
    return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  if (bucketSeconds < 86400)
    return `${p2(d.getDate())}.${p2(d.getMonth() + 1)} ${p2(
      d.getHours(),
    )}:${p2(d.getMinutes())}`;
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** ISO/Date → "YYYY-MM-DDTHH:mm" for <input type="datetime-local"> (local). */
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(
    d.getHours(),
  )}:${p2(d.getMinutes())}`;
}

function bucketLabel(sec: number): string {
  if (sec < 60) return `${sec} sn`;
  if (sec < 3600) return `${sec / 60} dk`;
  if (sec < 86400) return `${sec / 3600} sa`;
  return `${sec / 86400} gün`;
}

const RESOLUTIONS: { value: string; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "1", label: "1 sn" },
  { value: "5", label: "5 sn" },
  { value: "10", label: "10 sn" },
  { value: "30", label: "30 sn" },
  { value: "60", label: "1 dk" },
  { value: "300", label: "5 dk" },
  { value: "900", label: "15 dk" },
  { value: "1800", label: "30 dk" },
  { value: "3600", label: "1 sa" },
  { value: "21600", label: "6 sa" },
  { value: "86400", label: "1 gün" },
];

interface DataFile {
  id: string;
  fileName: string;
  readingCount: number;
  size: number;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
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
interface SeriesResponse {
  bucketSeconds: number;
  from: string | null;
  to: string | null;
  pointCount: number;
  summary: Summary;
  series: SeriesBucket[];
}
interface ReadingsRange {
  min: string | null;
  max: string | null;
  count: number;
}
interface Reading {
  id: string;
  recordedAt: string;
  temperature: number;
  humidity: number;
}

export function DataPanel({ locationId }: { locationId: string }) {
  const [files, setFiles] = useState<DataFile[]>([]);
  const [range, setRange] = useState<ReadingsRange | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<SeriesBucket[]>([]);
  const [bucketSeconds, setBucketSeconds] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [resolution, setResolution] = useState("auto");
  const [tableRows, setTableRows] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  // Files + data range; defaults the picker to the latest day with data.
  const loadMeta = useCallback(async () => {
    if (!locationId) return;
    const [f, rg] = await Promise.all([
      axiosInstance.get<DataFile[]>(`/locations/${locationId}/data-files`),
      axiosInstance
        .get<ReadingsRange>(`/locations/${locationId}/readings/range`)
        .catch(() => ({ data: { min: null, max: null, count: 0 } })),
    ]);
    setFiles(f.data);
    setRange(rg.data);
    if (rg.data.max) {
      const max = new Date(rg.data.max);
      const start = new Date(max);
      start.setHours(0, 0, 0, 0);
      setFrom(toLocalInput(start));
      setTo(toLocalInput(max));
    }
  }, [locationId]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  // Fetch the downsampled series (+ raw rows for the table) for the range.
  useEffect(() => {
    if (!locationId || !from || !to) return;
    const id = ++reqId.current;
    setLoading(true);
    const isoFrom = new Date(from).toISOString();
    const isoTo = new Date(to).toISOString();
    const params: Record<string, string | number> = { from: isoFrom, to: isoTo };
    if (resolution !== "auto") params.bucket = Number(resolution);
    (async () => {
      try {
        const s = await axiosInstance.get<SeriesResponse>(
          `/locations/${locationId}/readings/series`,
          { params },
        );
        if (id !== reqId.current) return;
        setSeries(s.data.series);
        setBucketSeconds(s.data.bucketSeconds);
        setSummary(s.data.summary);
        const t = await axiosInstance.get<{ readings: Reading[] }>(
          `/locations/${locationId}/readings`,
          { params: { startDate: from.slice(0, 10), endDate: to.slice(0, 10) } },
        );
        if (id !== reqId.current) return;
        setTableRows(t.data.readings ?? []);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    })();
  }, [locationId, from, to, resolution]);

  const bucketMs = bucketSeconds * 1000;

  // Map buckets to chart rows (min–max as a 2-tuple band); break lines on gaps.
  const chartData = useMemo(() => {
    type Row = {
      t: number;
      tempAvg: number | null;
      tempRange: [number, number] | null;
      humAvg: number | null;
      humRange: [number, number] | null;
    };
    const out: Row[] = [];
    series.forEach((b, i) => {
      out.push({
        t: b.t,
        tempAvg: b.tempAvg,
        tempRange:
          b.tempMin != null && b.tempMax != null ? [b.tempMin, b.tempMax] : null,
        humAvg: b.humidityAvg,
        humRange:
          b.humidityMin != null && b.humidityMax != null
            ? [b.humidityMin, b.humidityMax]
            : null,
      });
      const next = series[i + 1];
      if (next && bucketMs > 0 && next.t - b.t > bucketMs * 1.5) {
        out.push({
          t: b.t + bucketMs,
          tempAvg: null,
          tempRange: null,
          humAvg: null,
          humRange: null,
        });
      }
    });
    return out;
  }, [series, bucketMs]);

  // Proportional time axis → horizontal scroll for wide ranges.
  const chartWidth = useMemo(() => {
    if (series.length < 2 || bucketMs <= 0) return 0;
    const span = series[series.length - 1].t - series[0].t;
    const slots = span / bucketMs;
    return Math.min(Math.max(Math.round(slots * 14), 0), 24000);
  }, [series, bucketMs]);

  const onUpload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await axiosInstance.post(`/locations/${locationId}/data`, form);
      await loadMeta();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Upload failed.";
      setError(String(msg));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDownload = async (f: DataFile) => {
    const { data } = await axiosInstance.get<Blob>(
      `/location-data-files/${f.id}/download`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDelete = async (id: string) => {
    await axiosInstance.delete(`/location-data-files/${id}`);
    await loadMeta();
  };

  const setPreset = (preset: "latest" | "today" | "week" | "all") => {
    const max = range?.max ? new Date(range.max) : new Date();
    const min = range?.min ? new Date(range.min) : new Date();
    let f: Date;
    let t: Date = max;
    if (preset === "latest") {
      f = new Date(max);
      f.setHours(0, 0, 0, 0);
    } else if (preset === "today") {
      t = new Date();
      f = new Date();
      f.setHours(0, 0, 0, 0);
    } else if (preset === "week") {
      f = new Date(max.getTime() - 7 * 86400_000);
    } else {
      f = min;
    }
    setFrom(toLocalInput(f));
    setTo(toLocalInput(t));
  };

  const hasData = (range?.count ?? 0) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Sensor data (temperature / humidity)</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
            }}
          />
          <Can perm="location-data:create">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-1 h-4 w-4" />
              {busy ? "Uploading..." : "Upload .xls"}
            </Button>
          </Can>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Aggregated conditions for the selected range */}
        <div className="rounded-md border p-3 text-sm">
          {summary && summary.count ? (
            <div className="flex flex-wrap gap-4">
              <span>
                <span className="text-muted-foreground">Readings:</span>{" "}
                {summary.count}
              </span>
              <span>
                <span className="text-muted-foreground">Temp:</span>{" "}
                {summary.tempMin}–{summary.tempMax}°C (avg {summary.tempAvg})
              </span>
              <span>
                <span className="text-muted-foreground">Humidity:</span>{" "}
                {summary.humidityMin}–{summary.humidityMax}% (avg{" "}
                {summary.humidityAvg})
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {hasData
                ? "No readings in the selected range."
                : "No readings yet — upload a sensor .xls file."}
            </span>
          )}
        </div>

        {hasData && (
          <Tabs defaultValue="chart" className="w-full">
            <TabsList>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>

            <TabsContent value="chart">
              <div className="rounded-md border p-2">
                {/* Range + resolution controls */}
                <div className="mb-3 flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="datetime-local"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="h-8 w-52"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="datetime-local"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="h-8 w-52"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => setPreset("latest")}>
                      Son gün
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPreset("today")}>
                      Bugün
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPreset("week")}>
                      Son 7 gün
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPreset("all")}>
                      Tümü
                    </Button>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Label className="text-xs">Çözünürlük</Label>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOLUTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="mb-2 text-xs text-muted-foreground">
                  {loading
                    ? "Yükleniyor…"
                    : `${resolution === "auto" ? "Auto → " : ""}${bucketLabel(
                        bucketSeconds,
                      )} bucket · ${series.length} nokta`}
                </p>

                {series.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Seçili aralıkta veri yok.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <div
                      className="space-y-4"
                      style={{
                        width: chartWidth ? `${chartWidth}px` : "100%",
                        minWidth: "100%",
                      }}
                    >
                      <div>
                        <p className="mb-1 text-sm font-medium">
                          Temperature (°C)
                        </p>
                        <ResponsiveContainer width="100%" height={240}>
                          <ComposedChart
                            data={chartData}
                            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="t"
                              type="number"
                              domain={["dataMin", "dataMax"]}
                              scale="time"
                              tick={{ fontSize: 11 }}
                              minTickGap={40}
                              tickFormatter={(v) => tickFormat(v, bucketSeconds)}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              domain={["auto", "auto"]}
                              width={44}
                            />
                            <Tooltip
                              labelFormatter={(v) => fmtDateTime(v as number)}
                            />
                            <Area
                              type="monotone"
                              dataKey="tempRange"
                              name="Min–Max"
                              stroke="none"
                              fill="#ef4444"
                              fillOpacity={0.15}
                              connectNulls={false}
                              isAnimationActive={false}
                              activeDot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="tempAvg"
                              name="Ortalama (°C)"
                              stroke="#ef4444"
                              dot={false}
                              connectNulls={false}
                              isAnimationActive={false}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>

                      <div>
                        <p className="mb-1 text-sm font-medium">Humidity (%RH)</p>
                        <ResponsiveContainer width="100%" height={240}>
                          <ComposedChart
                            data={chartData}
                            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="t"
                              type="number"
                              domain={["dataMin", "dataMax"]}
                              scale="time"
                              tick={{ fontSize: 11 }}
                              minTickGap={40}
                              tickFormatter={(v) => tickFormat(v, bucketSeconds)}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              domain={["auto", "auto"]}
                              width={44}
                            />
                            <Tooltip
                              labelFormatter={(v) => fmtDateTime(v as number)}
                            />
                            <Area
                              type="monotone"
                              dataKey="humRange"
                              name="Min–Max"
                              stroke="none"
                              fill="#3b82f6"
                              fillOpacity={0.15}
                              connectNulls={false}
                              isAnimationActive={false}
                              activeDot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="humAvg"
                              name="Ortalama (%RH)"
                              stroke="#3b82f6"
                              dot={false}
                              connectNulls={false}
                              isAnimationActive={false}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="table">
              <div className="max-h-[360px] overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Temp (°C)
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        Humidity (%RH)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r, i) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-3 py-1.5">{fmtDateTime(r.recordedAt)}</td>
                        <td className="px-3 py-1.5 text-right">{r.temperature}</td>
                        <td className="px-3 py-1.5 text-right">{r.humidity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Seçili aralıktaki ham kayıtlar (ilk 5000).
              </p>
            </TabsContent>
          </Tabs>
        )}

        {files.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">File</th>
                <th className="pb-2 font-medium text-right">Readings</th>
                <th className="pb-2 font-medium">Period</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="py-2">{f.fileName}</td>
                  <td className="py-2 text-right">
                    <Badge variant="secondary">{f.readingCount}</Badge>
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {fmtDateTime(f.startTime)}
                    {" → "}
                    {fmtDateTime(f.endTime)}
                  </td>
                  <td className="py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Download"
                        onClick={() => void onDownload(f)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Can perm="location-data:delete">
                        <ConfirmDelete
                          title="Delete data file?"
                          description={`"${f.fileName}" and its ${f.readingCount} readings will be removed.`}
                          onConfirm={() => void onDelete(f.id)}
                          trigger={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                            >
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
          <p className="text-sm text-muted-foreground">
            No data files uploaded yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
