import { useCallback, useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/app-version";

const POLL_MS = 5 * 60 * 1000;
const DISMISS_KEY = "wg-update-banner-dismiss";
/** Cross-tab signal: detected server version (20.5B.7D). */
export const CROSS_TAB_SERVER_VERSION_KEY = "wg-update-server-version";

export async function fetchServerVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: unknown };
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

export function isNewerVersionAvailable(
  currentVersion: string,
  serverVersion: string | null,
): boolean {
  return serverVersion !== null && serverVersion !== currentVersion;
}

export function readCrossTabServerVersion(): string | null {
  try {
    const v = localStorage.getItem(CROSS_TAB_SERVER_VERSION_KEY);
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function clearCrossTabServerVersion(): void {
  try {
    localStorage.removeItem(CROSS_TAB_SERVER_VERSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Persist only when server reports a version newer than the bundle. */
export function persistCrossTabServerVersion(
  detectedVersion: string,
  currentVersion: string,
): void {
  if (!isNewerVersionAvailable(currentVersion, detectedVersion)) {
    clearCrossTabServerVersion();
    return;
  }
  try {
    localStorage.setItem(CROSS_TAB_SERVER_VERSION_KEY, detectedVersion);
  } catch {
    /* ignore */
  }
}

/** Seed hook state from localStorage; clears stale keys when bundle caught up. */
export function resolveSeededServerVersion(currentVersion: string): string | null {
  const stored = readCrossTabServerVersion();
  if (!stored) return null;
  if (!isNewerVersionAvailable(currentVersion, stored)) {
    clearCrossTabServerVersion();
    return null;
  }
  return stored;
}

export function useAppVersionCheck() {
  const currentVersion = APP_VERSION;

  const [serverVersion, setServerVersion] = useState<string | null>(() =>
    resolveSeededServerVersion(currentVersion),
  );
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  const applyDetectedVersion = useCallback(
    (version: string) => {
      setServerVersion(version);
      if (isNewerVersionAvailable(currentVersion, version)) {
        persistCrossTabServerVersion(version, currentVersion);
      } else if (version === currentVersion) {
        clearCrossTabServerVersion();
      }
    },
    [currentVersion],
  );

  const check = useCallback(async () => {
    const next = await fetchServerVersion();
    if (next) applyDetectedVersion(next);
  }, [applyDetectedVersion]);

  useEffect(() => {
    void check();
    const interval = window.setInterval(() => void check(), POLL_MS);
    const onVis = () => {
      if (!document.hidden) void check();
    };
    const onFocus = () => void check();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CROSS_TAB_SERVER_VERSION_KEY) return;
      if (e.newValue == null) {
        void check();
        return;
      }
      if (isNewerVersionAvailable(currentVersion, e.newValue)) {
        setServerVersion(e.newValue);
        return;
      }
      if (e.newValue === currentVersion) {
        clearCrossTabServerVersion();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [currentVersion, check]);

  const updateDetected = isNewerVersionAvailable(currentVersion, serverVersion);
  const updateAvailable = updateDetected && serverVersion !== dismissedVersion;

  const dismiss = useCallback(() => {
    if (!serverVersion) return;
    try {
      sessionStorage.setItem(DISMISS_KEY, serverVersion);
    } catch {
      /* ignore */
    }
    setDismissedVersion(serverVersion);
  }, [serverVersion]);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    updateAvailable,
    currentVersion,
    serverVersion,
    dismiss,
    reload,
  };
}
