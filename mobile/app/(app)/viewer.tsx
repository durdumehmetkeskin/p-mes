import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { File } from "expo-file-system";
import { Share2 } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import * as XLSX from "xlsx";
import { toast } from "sonner-native";

import { EmptyState } from "@/components/refine-ui/empty-state";
import { Screen } from "@/components/refine-ui/screen";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { downloadAndShare, fetchToFile } from "@/lib/download";
import { colors } from "@/lib/theme";

// Native modules that Expo Go can't load — required lazily so a missing native
// module degrades to a share fallback instead of crashing the screen.
function useLazy<T>(loader: () => T | null): T | null {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    try {
      return loader();
    } catch {
      return null;
    }
  }, []);
}

function kindFor(name: string): "pdf" | "xlsx" | "docx" | "image" | "other" {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "docx" || ext === "doc") return "docx";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  return "other";
}

function NativeUnavailable({ label, onShare }: { label: string; onShare: () => void }) {
  return (
    <EmptyState
      title={`${label} preview unavailable`}
      message="Inline preview needs a dev build. Open or share the file instead."
      action={<Button label="Open / Share" onPress={onShare} />}
    />
  );
}

function PdfBranch({ uri, onShare }: { uri: string; onShare: () => void }) {
  const Pdf = useLazy(() => require("react-native-pdf").default as React.ComponentType<{
    source: { uri: string };
    style?: object;
    trustAllCerts?: boolean;
  }>);
  if (!Pdf) return <NativeUnavailable label="PDF" onShare={onShare} />;
  return (
    <Pdf
      source={{ uri }}
      style={{
        flex: 1,
        width: Dimensions.get("window").width,
        backgroundColor: colors.background,
      }}
      trustAllCerts={false}
    />
  );
}

function XlsxBranch({ uri }: { uri: string }) {
  const [sheets, setSheets] = useState<{ name: string; rows: unknown[][] }[]>([]);
  const [active, setActive] = useState(0);
  const [err, setErr] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ab = await new File(uri).arrayBuffer();
        const wb = XLSX.read(new Uint8Array(ab), { type: "array" });
        setSheets(
          wb.SheetNames.map((n) => ({
            name: n,
            rows: XLSX.utils.sheet_to_json(wb.Sheets[n], {
              header: 1,
            }) as unknown[][],
          })),
        );
      } catch {
        setErr(true);
      }
    })();
  }, [uri]);

  if (err) return <EmptyState title="Could not read spreadsheet" />;
  if (!sheets.length)
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );

  const rows = (sheets[active]?.rows ?? []).slice(0, 500);
  return (
    <View className="flex-1">
      {sheets.length > 1 ? (
        <ScrollView horizontal className="border-b border-border" contentContainerStyle={{ padding: 8, gap: 8 }}>
          {sheets.map((s, i) => (
            <Pressable
              key={s.name}
              onPress={() => setActive(i)}
              className={cn(
                "rounded-md border px-3 py-1.5",
                i === active ? "border-primary bg-primary/15" : "border-border",
              )}
            >
              <Text className={cn("text-xs", i === active ? "text-primary" : "text-muted-foreground")}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <ScrollView>
        <ScrollView horizontal>
          <View>
            {rows.map((r, ri) => (
              <View key={ri} className={cn("flex-row", ri === 0 && "bg-muted/40")}>
                {(r ?? []).map((cell, ci) => (
                  <Text
                    key={ci}
                    className="min-w-[96px] border border-border px-2 py-1 text-xs text-foreground"
                    numberOfLines={1}
                  >
                    {cell == null ? "" : String(cell)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

function DocxBranch({ uri, onShare }: { uri: string; onShare: () => void }) {
  const WebView = useLazy(
    () => require("react-native-webview").WebView as React.ComponentType<{
      originWhitelist?: string[];
      style?: object;
      source: { html: string };
    }>,
  );
  const mammoth = useLazy(() => require("mammoth"));
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mammoth || !WebView) {
      setFailed(true);
      return;
    }
    (async () => {
      try {
        const ab = await new File(uri).arrayBuffer();
        const res = await mammoth.convertToHtml({ arrayBuffer: ab });
        setHtml(res.value);
      } catch {
        setFailed(true);
      }
    })();
  }, [uri, mammoth, WebView]);

  if (failed || !WebView) return <NativeUnavailable label="Document" onShare={onShare} />;
  if (html == null)
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  return (
    <WebView
      originWhitelist={["*"]}
      style={{ flex: 1, backgroundColor: colors.background }}
      source={{
        html: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="background:${colors.background};color:${colors.foreground};font-family:-apple-system,Roboto,sans-serif;padding:16px;line-height:1.5">${html}</body></html>`,
      }}
    />
  );
}

export default function ViewerScreen() {
  const { url, name } = useLocalSearchParams<{ url: string; name?: string }>();
  const fileName = name ?? "file";
  const [local, setLocal] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const kind = kindFor(fileName);

  useEffect(() => {
    (async () => {
      try {
        const f = await fetchToFile({ url: url as string, fallbackName: fileName });
        setLocal(f.uri);
      } catch {
        setError(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const share = () =>
    downloadAndShare({ url: url as string, fallbackName: fileName }).catch(() =>
      toast.error("Share failed"),
    );

  const headerRight = (
    <Pressable onPress={share} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-md active:bg-accent">
      <Icon icon={Share2} color={colors.foreground} />
    </Pressable>
  );

  return (
    <Screen title={fileName} canGoBack headerRight={headerRight}>
      {error ? (
        <EmptyState title="Couldn't load file" action={<Button label="Retry share" onPress={share} />} />
      ) : !local ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : kind === "pdf" ? (
        <PdfBranch uri={local} onShare={share} />
      ) : kind === "xlsx" ? (
        <XlsxBranch uri={local} />
      ) : kind === "docx" ? (
        <DocxBranch uri={local} onShare={share} />
      ) : kind === "image" ? (
        <Image source={{ uri: local }} style={{ flex: 1 }} resizeMode="contain" />
      ) : (
        <EmptyState
          title="Preview not supported"
          message="Open this file in another app."
          action={<Button label="Open / Share" onPress={share} />}
        />
      )}
    </Screen>
  );
}
