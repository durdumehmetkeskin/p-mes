import * as SecureStore from "expo-secure-store";

import { REFRESH_TOKEN_KEY, TOKEN_KEY } from "@/lib/constants";

/**
 * Token store: secrets live in the OS keychain/keystore (expo-secure-store,
 * async), fronted by a synchronous in-memory mirror so the axios request
 * interceptor can attach the Bearer header synchronously. `hydrateTokens()`
 * must run once at boot before the router renders.
 *
 * Biometric gating (SecureStore `requireAuthentication`) is finalized in
 * Phase 10; the API here already isolates all persistence so that change is
 * localized.
 */

let accessToken: string | null = null;
let refreshToken: string | null = null;
let hydrated = false;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function isHydrated(): boolean {
  return hydrated;
}

export async function hydrateTokens(): Promise<void> {
  try {
    const [a, r] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    accessToken = a;
    refreshToken = r;
  } catch {
    accessToken = null;
    refreshToken = null;
  } finally {
    hydrated = true;
  }
}

export async function setTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
