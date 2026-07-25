import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ErrorAlertPayload {
  /** Short, human title — what failed. */
  title: string;
  /** Detailed explanation lines (backend messages, hints). */
  messages: string[];
  /** HTTP status (or short code) shown as a chip; null = hidden. */
  code?: string | number | null;
}

let listener: ((p: ErrorAlertPayload) => void) | null = null;

/** Imperatively open the themed error dialog (host lives in App). */
export function showErrorAlert(payload: ErrorAlertPayload): void {
  listener?.(payload);
}

/**
 * Show an API error in the themed dialog with full detail: every backend
 * message line (`{statusCode, message: string|string[], error}` — the global
 * AllExceptionsFilter shape), the HTTP status, and a human explanation for
 * network failures.
 */
export function showApiError(err: unknown, title = "İşlem başarısız"): void {
  const e = err as {
    response?: {
      status?: number;
      data?: { message?: string | string[]; error?: string };
    };
    message?: string;
  };
  const resp = e?.response;
  let messages: string[];
  if (!resp) {
    messages = [
      "Sunucuya ulaşılamadı — internet bağlantınızı kontrol edip tekrar deneyin.",
    ];
  } else {
    const raw = resp.data?.message;
    messages = Array.isArray(raw) ? raw : raw ? [raw] : [];
    if (messages.length === 0) {
      messages = [
        resp.data?.error ??
          e?.message ??
          "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
      ];
    }
  }
  showErrorAlert({ title, messages, code: resp?.status ?? null });
}

/**
 * Themed error dialog. Mounted ONCE in App; the notification provider routes
 * every Refine error notification here so failures are read, not missed.
 */
export function ErrorAlertHost() {
  const [payload, setPayload] = useState<ErrorAlertPayload | null>(null);

  useEffect(() => {
    listener = setPayload;
    return () => {
      listener = null;
    };
  }, []);

  return (
    <AlertDialog
      open={payload !== null}
      onOpenChange={(open) => !open && setPayload(null)}
    >
      <AlertDialogContent className="border-destructive/40">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0 text-destructive" />
            <span className="flex-1">{payload?.title}</span>
            {payload?.code != null && (
              <span className="rounded-md border border-destructive/40 px-1.5 py-0.5 font-mono text-xs font-normal text-destructive">
                {payload.code}
              </span>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="max-h-72 space-y-2 overflow-y-auto pt-1 text-left">
              {(payload?.messages ?? []).map((m, i) => (
                <div key={i} className="flex gap-2 text-sm leading-5">
                  {(payload?.messages.length ?? 0) > 1 && (
                    <span className="text-destructive">•</span>
                  )}
                  <span className="flex-1">{m}</span>
                </div>
              ))}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setPayload(null)}>
            Tamam
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
