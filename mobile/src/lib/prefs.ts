import * as SecureStore from "expo-secure-store";

/**
 * Small persisted preferences (dev API-URL override + biometric lock flag),
 * fronted by a sync mirror hydrated at boot (like tokenStore).
 */
const API_URL_KEY = "p-mes-api-url-override";
const BIOMETRIC_KEY = "p-mes-biometric";

let apiOverride: string | null = null;
let biometric = false;

export async function hydratePrefs(): Promise<void> {
  try {
    apiOverride = await SecureStore.getItemAsync(API_URL_KEY);
    biometric = (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === "1";
  } catch {
    apiOverride = null;
    biometric = false;
  }
}

export function getApiOverride(): string | null {
  return apiOverride;
}

export async function setApiOverride(url: string | null): Promise<void> {
  apiOverride = url && url.trim() ? url.trim() : null;
  if (apiOverride) await SecureStore.setItemAsync(API_URL_KEY, apiOverride);
  else await SecureStore.deleteItemAsync(API_URL_KEY);
}

export function getBiometric(): boolean {
  return biometric;
}

export async function setBiometric(on: boolean): Promise<void> {
  biometric = on;
  await SecureStore.setItemAsync(BIOMETRIC_KEY, on ? "1" : "0");
}
