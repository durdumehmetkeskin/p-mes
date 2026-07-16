import type { AxiosError } from "axios";
import { Download, Loader2, Printer, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { useNotification } from "@refinedev/core";

import { Can } from "@/components/can";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { axiosInstance } from "@/providers/axios";

/** Resources that expose a `GET /:id/qr` PNG endpoint on the backend. */
type QrResource =
  | "tools"
  | "materials"
  | "order-items"
  | "stock-items"
  | "products";

const RESOURCE_LABEL: Record<QrResource, string> = {
  tools: "Tool",
  materials: "Materyal",
  "order-items": "Sipariş kalemi",
  "stock-items": "Stok kalemi",
  products: "Ürün",
};

/** Read a human-readable message out of a blob error body (responseType blob). */
async function blobErrorMessage(err: unknown, fallback: string): Promise<string> {
  const data = (err as AxiosError)?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed?.message) {
        return Array.isArray(parsed.message)
          ? parsed.message.join(", ")
          : String(parsed.message);
      }
    } catch {
      // Body was not JSON — fall through to the default message.
    }
  }
  return fallback;
}

/**
 * A reusable dialog that fetches and displays the QR code (PNG) for a single
 * tool / material / order, with download and print actions. The image is
 * produced on demand by the backend and only fetched while the dialog is open.
 *
 * Gated on the resource's `:read` permission, mirroring its list/show pages.
 */
export function QrCodeDialog({
  resource,
  id,
  code,
  title,
  trigger,
}: {
  resource: QrResource;
  id: string;
  code: string;
  /** Optional human label shown alongside the code (e.g. the entity name). */
  title?: string;
  /** Custom trigger element; defaults to a small outline "QR" button. */
  trigger?: ReactNode;
}) {
  const { open: notify } = useNotification();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const safeCode = code.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const fileName = `${resource}-${safeCode}-qr.png`;

  // Fetch the QR image whenever the dialog opens; revoke the object URL on close
  // or unmount so we never leak blob references.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setImageUrl(null);

    axiosInstance
      .get<Blob>(`/${resource}/${id}/qr`, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setImageUrl(objectUrl);
      })
      .catch(async (err) => {
        if (cancelled) return;
        notify?.({
          type: "error",
          message: "QR oluşturulamadı",
          description: await blobErrorMessage(err, "Karekod üretilemedi."),
        });
        setOpen(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, resource, id, notify]);

  const download = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = fileName;
    a.click();
  };

  const print = () => {
    if (!imageUrl) return;
    const w = window.open("", "_blank", "width=420,height=520");
    if (!w) return;
    w.document.write(
      `<html><head><title>${fileName}</title></head>` +
        `<body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">` +
        `<img src="${imageUrl}" style="width:300px;height:300px" onload="window.focus();window.print()" />` +
        `<div style="margin-top:12px;font-size:14px">${code}</div>` +
        `</body></html>`,
    );
    w.document.close();
  };

  return (
    <Can perm={`${resource}:read`}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" variant="outline">
              <QrCode className="mr-1 h-4 w-4" />
              QR
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR kodu</DialogTitle>
            <DialogDescription>
              {RESOURCE_LABEL[resource]} · {title ?? code}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-64 w-64 items-center justify-center rounded-md border bg-white">
              {loading || !imageUrl ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <img
                  src={imageUrl}
                  alt={`QR ${code}`}
                  className="h-60 w-60"
                />
              )}
            </div>
            <span className="font-mono text-sm text-muted-foreground">
              {code}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={download}
                disabled={!imageUrl}
              >
                <Download className="mr-1 h-4 w-4" />
                PNG indir
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={print}
                disabled={!imageUrl}
              >
                <Printer className="mr-1 h-4 w-4" />
                Yazdır
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Can>
  );
}
