/**
 * Tiny pub/sub so the axios refresh flow can tell the app "the session is
 * dead" (refresh rejected with 401/403) without importing navigation. The
 * root layout subscribes and redirects to /login.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function onSessionInvalid(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSessionInvalid(): void {
  listeners.forEach((l) => l());
}
