import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { AlertTriangle } from "lucide-react-native";

import { Icon } from "@/components/ui/icon";
import { colors } from "@/lib/theme";

export interface ErrorAlertPayload {
  /** Short, human title — what failed. */
  title: string;
  /** Detailed explanation lines (backend messages, hints). */
  messages: string[];
  /** HTTP status (or short code) shown as a chip; null = hidden. */
  code?: string | number | null;
}

let listener: ((p: ErrorAlertPayload) => void) | null = null;

/** Imperatively open the themed error dialog (host lives in the root layout). */
export function showErrorAlert(payload: ErrorAlertPayload): void {
  listener?.(payload);
}

/**
 * Show an API error in the themed dialog with full detail: every backend
 * message line (`{statusCode, message: string|string[], error}` — the global
 * AllExceptionsFilter shape), the HTTP status, and a human explanation for
 * network failures. Use this instead of the OS Alert for every failed call.
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
 * Themed error dialog (the app-styled replacement for the OS Alert). Mounted
 * ONCE in the root layout; opened via {@link showErrorAlert}/{@link showApiError}.
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
    <Modal
      visible={payload !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setPayload(null)}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/60 p-6"
        onPress={() => setPayload(null)}
      >
        {/* Stop backdrop-press from closing when tapping the card itself. */}
        <Pressable
          onPress={() => undefined}
          className="w-full max-w-md overflow-hidden rounded-lg border border-destructive/40 bg-card"
        >
          <View className="flex-row items-center gap-2 border-b border-border bg-destructive/10 px-4 py-3">
            <Icon icon={AlertTriangle} size={18} color={colors.destructive} />
            <Text className="flex-1 font-sans-semibold text-base text-foreground">
              {payload?.title}
            </Text>
            {payload?.code != null ? (
              <View className="rounded-md border border-destructive/40 px-1.5 py-0.5">
                <Text className="font-mono text-[11px] text-destructive">
                  {payload.code}
                </Text>
              </View>
            ) : null}
          </View>

          <ScrollView
            className="max-h-72"
            contentContainerStyle={{ padding: 16, gap: 8 }}
          >
            {(payload?.messages ?? []).map((m, i) => (
              <View key={i} className="flex-row gap-2">
                {(payload?.messages.length ?? 0) > 1 ? (
                  <Text className="text-sm text-destructive">•</Text>
                ) : null}
                <Text className="flex-1 text-sm leading-5 text-foreground">
                  {m}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View className="border-t border-border p-3">
            <Pressable
              onPress={() => setPayload(null)}
              className="h-10 items-center justify-center rounded-md bg-primary active:opacity-80"
            >
              <Text className="font-sans-semibold text-sm text-primary-foreground">
                Tamam
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
