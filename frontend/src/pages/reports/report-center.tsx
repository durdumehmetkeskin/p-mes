import { useList, useNotification } from "@refinedev/core";
import type { AxiosError } from "axios";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FileType,
  Loader2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Can } from "@/components/can";
import { ConfirmDelete } from "@/pages/projects/workspace/confirm-delete";
import { ReportPreview } from "./report-preview";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { axiosInstance } from "@/providers/axios";

interface ReportDefinitionRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  dataSource: string;
  recipe: string;
  isActive: boolean;
}

interface ParamField {
  name: string;
  label: string;
  type: "project" | "order" | "warehouse" | "location" | "user" | "date" | "text";
  required: boolean;
}

interface DataSourceInfo {
  key: string;
  label: string;
  params: ParamField[];
}

interface HistoryRecord {
  id: string;
  definitionName: string;
  format: string;
  fileName: string;
  createdAt: string;
}

type Format = "pdf" | "xlsx" | "docx";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  // Defer revocation to the next tick: revoking synchronously on the same tick
  // as click() can free the blob URL before the browser fetches it, silently
  // cancelling the download in Firefox/Safari.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const ReportCenter = () => {
  const { open } = useNotification();

  // Active report definitions to choose from.
  const { result: definitions } = useList<ReportDefinitionRecord>({
    resource: "report-definitions",
    pagination: { mode: "off" },
  });

  // Option sources for the parameter selects.
  const { result: projects } = useList({
    resource: "projects",
    pagination: { mode: "off" },
  });
  const { result: orders } = useList({
    resource: "orders",
    pagination: { mode: "off" },
  });
  const { result: warehouses } = useList({
    resource: "warehouses",
    pagination: { mode: "off" },
  });
  const { result: locations } = useList({
    resource: "locations",
    pagination: { mode: "off" },
  });
  const { result: users } = useList({
    resource: "users",
    pagination: { mode: "off" },
  });

  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([]);
  const [reportId, setReportId] = useState("");
  const [format, setFormat] = useState<Format>("pdf");
  const [params, setParams] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFileName, setPreviewFileName] = useState("report.pdf");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [renameTarget, setRenameTarget] = useState<HistoryRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");

  useEffect(() => {
    axiosInstance
      .get<DataSourceInfo[]>("/reports/data-sources")
      .then((res) => setDataSources(res.data))
      .catch(() => undefined);
  }, []);

  const loadHistory = useCallback(() => {
    const q = historyQuery.trim();
    axiosInstance
      .get<HistoryRecord[]>("/reports/history", {
        params: {
          _start: 0,
          // Show a short recent list by default; widen the window while searching.
          _end: q ? 50 : 8,
          _sort: "createdAt",
          _order: "desc",
          ...(q ? { q } : {}),
        },
      })
      .then((res) => setHistory(res.data))
      .catch(() => undefined);
  }, [historyQuery]);

  // Reload (debounced) whenever the search term changes.
  useEffect(() => {
    const t = setTimeout(loadHistory, 300);
    return () => clearTimeout(t);
  }, [loadHistory]);

  const reports = useMemo(
    () => (definitions?.data ?? []).filter((d) => d.isActive),
    [definitions],
  );
  const selectedReport = reports.find((r) => r.id === reportId);
  const dataSource = dataSources.find(
    (d) => d.key === selectedReport?.dataSource,
  );
  const paramFields = dataSource?.params ?? [];

  const onSelectReport = (id: string) => {
    setReportId(id);
    setParams({});
    setPreviewBlob(null);
    const report = reports.find((r) => r.id === id);
    setFormat(report?.recipe === "html-to-xlsx" ? "xlsx" : "pdf");
  };

  const optionsFor = (type: ParamField["type"]) => {
    if (type === "project") return projects?.data ?? [];
    if (type === "order") return orders?.data ?? [];
    if (type === "warehouse") return warehouses?.data ?? [];
    if (type === "location") return locations?.data ?? [];
    if (type === "user") return users?.data ?? [];
    return [];
  };

  const optionLabel = (type: ParamField["type"], item: any): string => {
    if (type === "project") return `${item.code} · ${item.name}`;
    if (type === "order")
      return `${item.orderNumber}${item.name ? ` · ${item.name}` : ""}`;
    if (type === "warehouse") return `${item.code} · ${item.name}`;
    if (type === "location")
      return `${item.code ? `${item.code} · ` : ""}${item.name ?? item.id}`;
    if (type === "user")
      return `${item.name ?? item.id}${item.email ? ` · ${item.email}` : ""}`;
    return String(item.name ?? item.id);
  };

  const generate = async () => {
    if (!selectedReport) {
      open?.({ type: "error", message: "Select a report" });
      return;
    }
    const missing = paramFields.filter((f) => f.required && !params[f.name]);
    if (missing.length) {
      open?.({
        type: "error",
        message: "Missing parameters",
        description: missing.map((f) => f.label).join(", "),
      });
      return;
    }

    setGenerating(true);
    try {
      const res = await axiosInstance.post<Blob>(
        `/reports/${selectedReport.id}/render`,
        { parameters: params },
        { params: { format }, responseType: "blob" },
      );
      const blob = res.data;
      const fileName = `${selectedReport.key}.${format}`;

      // All three formats now render inline in the preview pane.
      setPreviewBlob(blob);
      setPreviewFileName(fileName);
      open?.({ type: "success", message: "Report generated" });
      loadHistory();
    } catch (err) {
      // The error body is a Blob (responseType blob); try to read its message.
      let description = "Could not generate the report.";
      const data = (err as AxiosError)?.response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          if (parsed?.message)
            description = Array.isArray(parsed.message)
              ? parsed.message.join(", ")
              : parsed.message;
        } catch {
          // keep default
        }
      }
      open?.({ type: "error", message: "Generation failed", description });
    } finally {
      setGenerating(false);
    }
  };

  const downloadHistory = async (record: HistoryRecord) => {
    try {
      const res = await axiosInstance.get<Blob>(
        `/reports/history/${record.id}/download`,
        { responseType: "blob" },
      );
      downloadBlob(res.data, record.fileName);
    } catch {
      open?.({ type: "error", message: "Download failed" });
    }
  };

  const viewHistory = async (record: HistoryRecord) => {
    setViewingId(record.id);
    try {
      const res = await axiosInstance.get<Blob>(
        `/reports/history/${record.id}/download`,
        { responseType: "blob" },
      );
      setPreviewBlob(res.data);
      setPreviewFileName(record.fileName);
    } catch {
      open?.({ type: "error", message: "Preview failed" });
    } finally {
      setViewingId(null);
    }
  };

  const deleteHistory = async (record: HistoryRecord) => {
    try {
      await axiosInstance.delete(`/reports/history/${record.id}`);
      open?.({ type: "success", message: "Report deleted" });
      loadHistory();
    } catch {
      open?.({ type: "error", message: "Delete failed" });
    }
  };

  const openRename = (record: HistoryRecord) => {
    setRenameTarget(record);
    // Pre-fill with the name without its extension for easier editing.
    setRenameValue(record.fileName.replace(/\.[^.]+$/, ""));
  };

  const submitRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    try {
      await axiosInstance.patch(`/reports/history/${renameTarget.id}`, {
        fileName: renameValue.trim(),
      });
      open?.({ type: "success", message: "Report renamed" });
      setRenameTarget(null);
      loadHistory();
    } catch {
      open?.({ type: "error", message: "Rename failed" });
    } finally {
      setRenaming(false);
    }
  };

  return (
    <ListView>
      <ListViewHeader title="Report Center" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---- Parameters ---- */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Generate a report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Report</Label>
              <Combobox
                value={reportId}
                onChange={onSelectReport}
                placeholder="Select a report"
                searchPlaceholder="Search reports…"
                options={reports.map((r) => ({ value: r.id, label: r.name }))}
              />
              {selectedReport?.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedReport.description}
                </p>
              )}
            </div>

            {paramFields.map((field) => (
              <div key={field.name} className="flex flex-col gap-2">
                <Label>
                  {field.label}
                  {field.required && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>
                {field.type === "date" || field.type === "text" ? (
                  <Input
                    type={field.type === "date" ? "date" : "text"}
                    value={params[field.name] ?? ""}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, [field.name]: e.target.value }))
                    }
                  />
                ) : (
                  <Combobox
                    value={params[field.name] ?? ""}
                    onChange={(v) =>
                      setParams((p) => ({ ...p, [field.name]: v }))
                    }
                    placeholder={`Select ${field.label}`}
                    searchPlaceholder={`Search ${field.label}…`}
                    options={optionsFor(field.type).map((item: any) => ({
                      value: item.id,
                      label: optionLabel(field.type, item),
                    }))}
                  />
                )}
              </div>
            ))}

            <div className="flex flex-col gap-2">
              <Label>Format</Label>
              <Combobox
                value={format}
                onChange={(v) => setFormat(v as Format)}
                searchPlaceholder="Search format…"
                options={[
                  { value: "pdf", label: "PDF" },
                  { value: "xlsx", label: "Excel (xlsx)" },
                  { value: "docx", label: "Word (docx)" },
                ]}
              />
            </div>

            <Can perm="reports:generate">
              <Button
                className="w-full"
                onClick={generate}
                disabled={generating || !reportId}
              >
                {generating ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : format === "pdf" ? (
                  <FileText className="mr-1 h-4 w-4" />
                ) : format === "xlsx" ? (
                  <FileSpreadsheet className="mr-1 h-4 w-4" />
                ) : (
                  <FileType className="mr-1 h-4 w-4" />
                )}
                {generating ? "Generating…" : "Generate"}
              </Button>
            </Can>

            {/* ---- Generated reports ---- */}
            {(history.length > 0 || historyQuery) && (
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">
                  {historyQuery ? "Search results" : "Recent reports"}
                </p>
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search reports…"
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                  />
                </div>
                {history.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No reports match “{historyQuery}”.
                  </p>
                ) : (
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-md border p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-medium"
                            title={h.fileName}
                          >
                            {h.fileName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {h.definitionName} ·{" "}
                            {new Date(h.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {h.format}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="View"
                          disabled={viewingId === h.id}
                          onClick={() => viewHistory(h)}
                        >
                          {viewingId === h.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Download"
                          onClick={() => downloadHistory(h)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Rename"
                          onClick={() => openRename(h)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDelete
                          title="Delete this report?"
                          description={`"${h.fileName}" will be permanently removed.`}
                          onConfirm={() => deleteHistory(h)}
                          trigger={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Rename dialog ---- */}
        <Dialog
          open={!!renameTarget}
          onOpenChange={(o) => !o && setRenameTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename report</DialogTitle>
            </DialogHeader>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="mb-1 block">File name</Label>
                <Input
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRename();
                  }}
                />
              </div>
              <span className="pb-2 text-sm text-muted-foreground">
                .{renameTarget?.format}
              </span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={submitRename}
                disabled={renaming || !renameValue.trim()}
              >
                {renaming && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- Preview ---- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preview</span>
              {previewBlob && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadBlob(previewBlob, previewFileName)}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Download
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportPreview
              blob={previewBlob}
              fileName={previewFileName}
              emptyHint="Generate a report or open one from the history to preview it here."
            />
          </CardContent>
        </Card>
      </div>
    </ListView>
  );
};
