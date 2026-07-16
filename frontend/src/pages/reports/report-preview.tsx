import { renderAsync } from "docx-preview";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";

type PreviewKind = "pdf" | "excel" | "word" | "none";

function kindOf(fileName: string): PreviewKind {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "xlsx" || ext === "xls") return "excel";
  if (ext === "docx") return "word";
  return "none";
}

/**
 * Inline viewer for a generated report blob. Renders PDFs in an iframe, Excel
 * workbooks as HTML tables (via SheetJS) and Word documents via docx-preview —
 * the same engines the attachment viewer uses, but embedded in a pane instead
 * of a dialog.
 */
export function ReportPreview({
  blob,
  fileName,
  emptyHint,
}: {
  blob: Blob | null;
  fileName: string;
  emptyHint?: string;
}) {
  const kind = blob ? kindOf(fileName) : "none";
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheet, setActiveSheet] = useState("");
  const [wordReady, setWordReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    setError(null);
    setObjectUrl(null);
    setWorkbook(null);
    setWordReady(false);

    if (!blob) return;

    (async () => {
      try {
        if (kind === "pdf") {
          url = URL.createObjectURL(blob);
          if (!cancelled) setObjectUrl(url);
        } else if (kind === "excel") {
          const wb = XLSX.read(await blob.arrayBuffer(), { type: "array" });
          if (cancelled) return;
          setWorkbook(wb);
          setActiveSheet(wb.SheetNames[0] ?? "");
        } else if (kind === "word") {
          if (!cancelled) setWordReady(true);
        }
      } catch {
        if (!cancelled) setError("Failed to load the report preview.");
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [blob, kind]);

  // Render the Word document once its bytes and container are both ready.
  useEffect(() => {
    if (kind === "word" && wordReady && blob && docxRef.current) {
      docxRef.current.innerHTML = "";
      renderAsync(blob, docxRef.current).catch(() =>
        setError("Failed to render the document."),
      );
    }
  }, [kind, wordReady, blob]);

  const sheetHtml = useMemo(() => {
    if (!workbook || !activeSheet) return "";
    return XLSX.utils.sheet_to_html(workbook.Sheets[activeSheet]);
  }, [workbook, activeSheet]);

  if (!blob) {
    return (
      <div className="flex h-[75vh] items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
        {emptyHint ?? "Generate a report to preview it here."}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[75vh] items-center justify-center rounded-md border bg-muted/20 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (kind === "pdf") {
    return objectUrl ? (
      <iframe
        src={objectUrl}
        title="Report preview"
        className="h-[75vh] w-full rounded-md border"
      />
    ) : null;
  }

  if (kind === "excel") {
    return (
      <div className="flex h-[75vh] flex-col overflow-hidden rounded-md border">
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
          // sheet HTML produced by SheetJS from our own rendered report
          dangerouslySetInnerHTML={{ __html: sheetHtml }}
        />
      </div>
    );
  }

  if (kind === "word") {
    return (
      <div className="h-[75vh] overflow-auto rounded-md border bg-muted/20">
        <div ref={docxRef} className="mx-auto bg-white p-4" />
      </div>
    );
  }

  return (
    <div className="flex h-[75vh] items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
      Preview is not available for this format — download it instead.
    </div>
  );
}
