import { renderAsync } from "docx-preview";
import { Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { axiosInstance } from "@/providers/axios";

export type ViewKind = "pdf" | "image" | "excel" | "word" | "none";

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"];

export function viewKind(
  fileName: string,
  contentType: string,
): ViewKind {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || contentType === "application/pdf") return "pdf";
  if (IMAGE_EXT.includes(ext) || contentType.startsWith("image/")) return "image";
  if (ext === "xlsx" || ext === "xls") return "excel";
  if (ext === "docx") return "word";
  return "none";
}

export function isViewable(fileName: string, contentType: string): boolean {
  return viewKind(fileName, contentType) !== "none";
}

interface ViewerAttachment {
  id: string;
  fileName: string;
  contentType: string;
}

export function FileViewerDialog({
  attachment,
  open,
  onOpenChange,
  onDownload,
}: {
  attachment: ViewerAttachment;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDownload: () => void;
}) {
  const kind = viewKind(attachment.fileName, attachment.contentType);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [wordBlob, setWordBlob] = useState<Blob | null>(null);
  const docxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let url: string | null = null;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setWorkbook(null);
    setWordBlob(null);
    setObjectUrl(null);

    (async () => {
      try {
        const { data } = await axiosInstance.get<Blob>(
          `/attachments/${attachment.id}/download`,
          { responseType: "blob" },
        );
        if (cancelled) return;
        if (kind === "pdf" || kind === "image") {
          url = URL.createObjectURL(data);
          setObjectUrl(url);
        } else if (kind === "excel") {
          const buf = await data.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          setWorkbook(wb);
          setActiveSheet(wb.SheetNames[0] ?? "");
        } else if (kind === "word") {
          setWordBlob(data);
        }
      } catch {
        if (!cancelled) setError("Failed to load the file.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, attachment.id, kind]);

  // Render the Word document once its bytes and container are ready.
  useEffect(() => {
    if (kind === "word" && wordBlob && docxRef.current) {
      docxRef.current.innerHTML = "";
      renderAsync(wordBlob, docxRef.current).catch(() =>
        setError("Failed to render the document."),
      );
    }
  }, [kind, wordBlob]);

  const sheetHtml = useMemo(() => {
    if (!workbook || !activeSheet) return "";
    return XLSX.utils.sheet_to_html(workbook.Sheets[activeSheet]);
  }, [workbook, activeSheet]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-5xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-6">
            <span className="truncate">{attachment.fileName}</span>
            <Button size="sm" variant="outline" onClick={onDownload}>
              <Download className="mr-1 h-4 w-4" />
              Download
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/20">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : kind === "pdf" && objectUrl ? (
            <iframe
              src={objectUrl}
              title={attachment.fileName}
              className="h-[78vh] w-full"
            />
          ) : kind === "image" && objectUrl ? (
            <div className="flex items-center justify-center p-4">
              <img
                src={objectUrl}
                alt={attachment.fileName}
                className="max-h-[78vh] max-w-full object-contain"
              />
            </div>
          ) : kind === "excel" ? (
            <div className="flex h-full flex-col">
              {workbook && workbook.SheetNames.length > 1 && (
                <div className="flex flex-wrap gap-1 border-b bg-background p-2">
                  {workbook.SheetNames.map((name) => (
                    <Button
                      key={name}
                      size="sm"
                      variant={name === activeSheet ? "default" : "outline"}
                      onClick={() => setActiveSheet(name)}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              )}
              <div
                className="overflow-auto bg-background p-2 text-sm [&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1"
                // sheet HTML produced by SheetJS from a trusted, admin-uploaded file
                dangerouslySetInnerHTML={{ __html: sheetHtml }}
              />
            </div>
          ) : kind === "word" ? (
            <div ref={docxRef} className="bg-white p-4" />
          ) : (
            <div className="space-y-3 p-6 text-sm text-muted-foreground">
              <p>Preview is not available for this file type.</p>
              <Button size="sm" variant="outline" onClick={onDownload}>
                <Download className="mr-1 h-4 w-4" />
                Download instead
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
