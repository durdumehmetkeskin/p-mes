import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_URL, REFRESH_TOKEN_KEY, TOKEN_KEY } from "./constants";

/**
 * Shared axios instance for both the data provider and the auth provider.
 * - Request: attaches the JWT access token. Kept SYNCHRONOUS on purpose — an
 *   async request interceptor defers every request a microtask, which trips
 *   react-query/StrictMode request cancellation and leaves edit-form dropdowns
 *   unhydrated. Proactive refresh is done off a background timer instead.
 * - Response: on a 401 it refreshes once and retries (fallback for tokens
 *   invalidated server-side).
 * - A background timer refreshes the token ~60s before it expires, so polling
 *   (the notification bell) never fires with a dead token and 401s.
 */
export const axiosInstance = axios.create({ baseURL: API_URL });

// Single-flight refresh: a burst of requests must trigger exactly ONE
// /auth/refresh — refresh tokens are single-use with reuse-detection, so a
// double refresh would revoke the whole session. Cleared in `finally`.
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
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    // Bare axios (not the instance) to avoid recursive interceptors.
    const { data } = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken,
    });
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    scheduleProactiveRefresh(); // re-arm for the rotated token
    return data.accessToken as string;
  } catch (err) {
    // Only a definitive auth rejection (the refresh token itself is invalid or
    // expired) ends the session. A transient network error or 5xx must NOT clear
    // the tokens — otherwise a brief blip during the background proactive refresh
    // would silently log out a user who still holds a valid session.
    const status = (err as AxiosError)?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
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
  const token = localStorage.getItem(TOKEN_KEY);
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
  const token = localStorage.getItem(TOKEN_KEY);
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

    // Endpoints that must NOT trigger refresh-and-retry: the refresh call
    // itself (would recurse) and the unauthenticated auth endpoints (login /
    // password reset) where a 401 is a real credential error, not an expired
    // access token. /auth/me and /auth/logout DO go through refresh, so a cold
    // start with an expired token still hydrates access control.
    const skipRefresh = /\/auth\/(refresh|login|forgot-password|reset-password)/.test(
      original?.url ?? "",
    );

    if (error.response?.status === 401 && original && !original._retry && !skipRefresh) {
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

// Arm the timer on load (handles an already-expired token: fires immediately).
scheduleProactiveRefresh();
