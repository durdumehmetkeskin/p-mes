import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_URL } from "@/lib/constants";
import { emitSessionInvalid } from "./sessionEvents";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./tokenStore";

/**
 * Shared axios instance for the data + auth providers (ported from the web
 * frontend). Adaptations for RN:
 *  - token is read from the synchronous in-memory mirror (tokenStore), not
 *    localStorage;
 *  - a failed refresh only clears the session on an explicit 401/403 — a
 *    network hiccup must NOT log the user out (mobile networks are flaky).
 *
 * The request interceptor is kept SYNCHRONOUS (an async one defers every
 * request a microtask and trips react-query cancellation, leaving edit-form
 * dropdowns unhydrated). Proactive refresh runs off a background timer instead.
 */
export const axiosInstance = axios.create({ baseURL: API_URL });

/** Runtime override for the API base URL (dev URL screen, Phase 10). */
export function setApiBaseUrl(url: string): void {
  axiosInstance.defaults.baseURL = url;
}

// Single-flight refresh so a burst of requests triggers only one /auth/refresh
// (refresh tokens are single-use with reuse-detection). Cleared in `finally`.
let refreshPromise: Promise<string | null> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    // Bare axios (not the instance) to avoid recursive interceptors.
    const { data } = await axios.post(
      `${axiosInstance.defaults.baseURL ?? API_URL}/auth/refresh`,
      { refreshToken },
    );
    await setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    scheduleProactiveRefresh(); // re-arm for the rotated token
    return data.accessToken as string;
  } catch (err) {
    const status = (err as AxiosError)?.response?.status;
    // Only an explicit auth rejection kills the session (family revoke / expiry).
    if (status === 401 || status === 403) {
      await clearTokens();
      emitSessionInvalid();
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    }
    return null;
  }
}

/** Read a JWT's `exp` (unix seconds); null if it can't be parsed. */
function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

// Refresh this long before the true expiry (covers latency + poll interval).
const REFRESH_LEAD_MS = 60_000;

function scheduleProactiveRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  const token = getAccessToken();
  if (!token) return;
  const exp = tokenExpiry(token);
  if (exp === null) return;

  const delay = Math.max(exp * 1000 - Date.now() - REFRESH_LEAD_MS, 0);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshAccessToken();
  }, delay);
}

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Arm the proactive-refresh timer after login (no token → no timer yet).
    if (!refreshTimer) scheduleProactiveRefresh();
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // Only token-issuing endpoints are exempt from refresh-retry (refreshing
    // after a failed login/refresh is meaningless and can recurse). /auth/me
    // and other authenticated /auth/* routes MUST retry like any request — a
    // cold start with an expired access token 401s here first, and without the
    // retry the permission load fails and the nav menu renders unfiltered.
    const isTokenEndpoint = [
      "/auth/login",
      "/auth/register",
      "/auth/refresh",
      "/auth/forgot-password",
      "/auth/reset-password",
    ].some((p) => original?.url?.includes(p));

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isTokenEndpoint
    ) {
      original._retry = true;
      const newToken = await refreshAccessToken();

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(original);
      }
    }

    return Promise.reject(error);
  },
);
