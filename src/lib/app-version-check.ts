import { useCallback, useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/app-version";

const POLL_MS = 5 * 60 * 1000;
const DISMISS_KEY = "wg-update-banner-dismiss";

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

export function useAppVersionCheck() {
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  const currentVersion = APP_VERSION;

  const check = useCallback(async () => {
    const next = await fetchServerVersion();
    if (next) setServerVersion(next);
  }, []);

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
