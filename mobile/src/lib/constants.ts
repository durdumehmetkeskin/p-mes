import Constants from "expo-constants";
import { Platform } from "react-native";

/** SecureStore keys (mirror the web localStorage keys). */
export const TOKEN_KEY = "p-mes-access-token";
export const REFRESH_TOKEN_KEY = "p-mes-refresh-token";

const DEFAULT_PORT = 3000;
const API_PREFIX = "/api";

/**
 * The Metro dev-server host (e.g. "192.168.1.5:8081" on a LAN, or
 * "localhost:8081"). Used to auto-target the dev machine so a physical device
 * or emulator can reach the dockerized API without hardcoding an IP.
 */
function metroDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Older/dev-client shapes:
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } })
      .expoGoConfig?.debuggerHost ??
    null;
  if (!hostUri) return null;
  return hostUri.split(":")[0] || null;
}

function resolveApiUrl(): string {
  // EXPO_PUBLIC_* is inlined by Metro at build time (the RN analogue of VITE_*).
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  const host = metroDevHost();
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:${DEFAULT_PORT}${API_PREFIX}`;
  }
  // Android emulator can't reach the host's localhost — use the loopback alias.
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_PORT}${API_PREFIX}`;
  }
  // iOS simulator / web share the host network.
  return `http://localhost:${DEFAULT_PORT}${API_PREFIX}`;
}

/** Resolved default API base URL. A runtime override (dev screen, Phase 10) can
 *  supersede this via setApiBaseUrl() in providers/axios. */
export const API_URL = resolveApiUrl();
