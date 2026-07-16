import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { axiosInstance } from "@/providers/axios";

const B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Encode bytes to base64 without relying on btoa/Buffer (Hermes-safe). */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)] : "=";
    out += i + 2 < bytes.length ? B64[b2 & 63] : "=";
  }
  return out;
}

/** Fetch an authed image (e.g. QR PNG) as a base64 data URI for <Image>. */
export async function fetchImageDataUri(url: string): Promise<string> {
  const res = await axiosInstance.get(url, { responseType: "arraybuffer" });
  const contentType =
    ((res.headers ?? {}) as Record<string, string>)["content-type"] ??
    "image/png";
  const base64 = bytesToBase64(new Uint8Array(res.data as ArrayBuffer));
  return `data:${contentType};base64,${base64}`;
}

/** Parse an RFC-5987 / plain filename from a Content-Disposition header. */
export function filenameFromDisposition(
  cd: string | undefined,
  fallback: string,
): string {
  if (!cd) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      return star[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(cd);
  return plain ? plain[1] : fallback;
}

/**
 * Fetches a streamed, auth-protected file through the shared axios instance
 * (so the Bearer token + refresh apply — there are no presigned URLs), writes
 * it to the cache, and opens the native share sheet.
 */
export interface FetchedFile {
  uri: string;
  name: string;
  contentType: string;
}

/** Fetch an authed streamed file into the cache and return its local URI. */
export async function fetchToFile(opts: {
  url: string;
  method?: "get" | "post";
  body?: unknown;
  fallbackName?: string;
}): Promise<FetchedFile> {
  const res = await axiosInstance.request({
    url: opts.url,
    method: opts.method ?? "get",
    data: opts.body,
    responseType: "arraybuffer",
  });

  const headers = (res.headers ?? {}) as Record<string, string>;
  const contentType = headers["content-type"] ?? "application/octet-stream";
  const name = filenameFromDisposition(
    headers["content-disposition"],
    opts.fallbackName ?? "download",
  );

  const file = new File(Paths.cache, name);
  try {
    if (file.exists) file.delete();
  } catch {
    // ignore
  }
  file.create();
  file.write(new Uint8Array(res.data as ArrayBuffer));

  return { uri: file.uri, name, contentType };
}

/** Fetch an authed file and open the native share sheet. */
export async function downloadAndShare(opts: {
  url: string;
  method?: "get" | "post";
  body?: unknown;
  fallbackName?: string;
}): Promise<void> {
  const { uri, name, contentType } = await fetchToFile(opts);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: contentType, dialogTitle: name });
  }
}
