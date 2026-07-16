import { Download, Eye, Paperclip, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Can } from "@/components/can";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/providers/axios";
import { ConfirmDelete } from "./confirm-delete";
import { FileViewerDialog, isViewable } from "./file-viewer-dialog";

export type AttachmentOwnerType =
  | "project"
  | "process"
  | "stage"
  // A stage's input/output documents (ownerId is the stage id).
  | "stage_input"
  | "stage_output";

interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${parseFloat((bytes / 1024 ** i).toFixed(1))} ${units[i]}`;
}

export function AttachmentsPanel({
  ownerType,
  ownerId,
  title = "Attachments",
}: {
  ownerType: AttachmentOwnerType;
  ownerId: string;
  title?: string;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<Attachment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!ownerId) return;
    const { data } = await axiosInstance.get<Attachment[]>("/attachments", {
      params: { ownerType, ownerId },
    });
    setItems(data);
  }, [ownerType, ownerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onUpload = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await axiosInstance.post(`/attachments/${ownerType}/${ownerId}`, form);
      await refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDownload = async (att: Attachment) => {
    const { data } = await axiosInstance.get<Blob>(
      `/attachments/${att.id}/download`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDelete = async (id: string) => {
    await axiosInstance.delete(`/attachments/${id}`);
    await refresh();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="h-4 w-4" />
          {title} ({items.length})
        </span>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onUpload(f);
          }}
        />
        <Can perm="attachments:create">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-1 h-4 w-4" />
            {busy ? "Uploading..." : "Upload"}
          </Button>
        </Can>
      </div>

      {items.length ? (
        <ul className="divide-y rounded-md border text-sm">
          {items.map((att) => (
            <li
              key={att.id}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{att.fileName}</div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(att.size)} ·{" "}
                  {new Date(att.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isViewable(att.fileName, att.contentType) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="View"
                    onClick={() => setViewing(att)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Download"
                  onClick={() => void onDownload(att)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Can perm="attachments:delete">
                  <ConfirmDelete
                    title="Delete file?"
                    description={`"${att.fileName}" will be permanently removed.`}
                    onConfirm={() => void onDelete(att.id)}
                    trigger={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                </Can>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No files yet.</p>
      )}

      {viewing && (
        <FileViewerDialog
          key={viewing.id}
          attachment={viewing}
          open={Boolean(viewing)}
          onOpenChange={(o) => !o && setViewing(null)}
          onDownload={() => void onDownload(viewing)}
        />
      )}
    </div>
  );
}
