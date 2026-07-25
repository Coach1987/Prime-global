"use client";

type AuthSessionSnapshot = {
  role: string | null;
  displayName: string | null;
  ts: number;
};

const AUTH_SESSION_EVENT = "prime-global:auth-session-changed";
const AUTH_STORAGE_KEY = "prime-global:auth-session-sync";

function toSnapshot(input?: Partial<AuthSessionSnapshot>): AuthSessionSnapshot {
  return {
    role: input?.role ?? null,
    displayName: input?.displayName ?? null,
    ts: Date.now(),
  };
}

export function emitAuthSessionChanged(input?: Partial<AuthSessionSnapshot>) {
  if (typeof window === "undefined") return;

  const snapshot = toSnapshot(input);

  window.dispatchEvent(new CustomEvent<AuthSessionSnapshot>(AUTH_SESSION_EVENT, { detail: snapshot }));

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage errors in restrictive browser contexts.
  }
}

export function subscribeAuthSessionChanged(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onCustomEvent = () => onChange();
  const onStorageEvent = (event: StorageEvent) => {
    if (event.key === AUTH_STORAGE_KEY) {
      onChange();
    }
  };
  const onFocus = () => onChange();
  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      onChange();
    }
  };
  const onPopState = () => onChange();

  window.addEventListener(AUTH_SESSION_EVENT, onCustomEvent as EventListener);
  window.addEventListener("storage", onStorageEvent);
  window.addEventListener("focus", onFocus);
  window.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("popstate", onPopState);

  return () => {
    window.removeEventListener(AUTH_SESSION_EVENT, onCustomEvent as EventListener);
    window.removeEventListener("storage", onStorageEvent);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("popstate", onPopState);
  };
}
