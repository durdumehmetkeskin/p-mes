export const TOKEN_KEY = "p-mes-access-token";
export const REFRESH_TOKEN_KEY = "p-mes-refresh-token";

const rawApiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3000/api";

// A relative value (e.g. "/api") is resolved against the page origin so one
// build works behind any host (e.g. Traefik on localhost). Must stay
// absolute: the simple-rest data provider sends full
// `${API_URL}/...` URLs through an axios instance whose baseURL is also
// API_URL — a relative API_URL would double to /api/api/... .
export const API_URL = rawApiUrl.startsWith("/")
  ? window.location.origin + rawApiUrl
  : rawApiUrl;
