import { useCallback, useEffect, useState } from "react";
import { APP_COMMIT, APP_VERSION } from "@/lib/app-version";

const POLL_MS = 5 * 60 * 1000;
const DISMISS_KEY = "wg-update-banner-dismiss";
/**
 * Cross-tab signal: wykryty build serwera (Release Version + Build Identity).
 * Detekcja opiera się o `commit` (build identity); `version` służy wyłącznie do prezentacji.
 */
export const CROSS_TAB_SERVER_BUILD_KEY = "wg-update-server-build";

/** Build serwera z `version.json`: Release Version (display) + commit (detekcja). */
export interface ServerBuild {
  version: string;
  commit: string;
}

function parseServerBuild(raw: unknown): ServerBuild | null {
  if (raw == null || typeof raw !== "object") return null;
  const data = raw as { version?: unknown; commit?: unknown };
  if (typeof data.commit !== "string" || data.commit.length === 0) return null;
  const version = typeof data.version === "string" && data.version.length > 0
    ? data.version
    : data.commit;
  return { version, commit: data.commit };
}

export async function fetchServerBuild(): Promise<ServerBuild | null> {
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return parseServerBuild(await res.json());
  } catch {
    return null;
  }
}

/**
 * Build Identity — banner po KAŻDYM deployu: inny commit = nowy build.
 * Release Version celowo nie bierze udziału w detekcji.
 */
export function isNewBuildAvailable(
  currentCommit: string,
  serverCommit: string | null,
): boolean {
  return serverCommit !== null && serverCommit !== currentCommit;
}

export function readCrossTabServerBuild(): ServerBuild | null {
  try {
    const raw = localStorage.getItem(CROSS_TAB_SERVER_BUILD_KEY);
    if (!raw) return null;
    return parseServerBuild(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearCrossTabServerBuild(): void {
  try {
    localStorage.removeItem(CROSS_TAB_SERVER_BUILD_KEY);
  } catch {
    /* ignore */
  }
}

/** Persist only when server reports a build (commit) different from the bundle. */
export function persistCrossTabServerBuild(
  detected: ServerBuild,
  currentCommit: string,
): void {
  if (!isNewBuildAvailable(currentCommit, detected.commit)) {
    clearCrossTabServerBuild();
    return;
  }
  try {
    localStorage.setItem(CROSS_TAB_SERVER_BUILD_KEY, JSON.stringify(detected));
  } catch {
    /* ignore */
  }
}

/** Seed hook state from localStorage; clears stale keys when bundle caught up. */
export function resolveSeededServerBuild(currentCommit: string): ServerBuild | null {
  const stored = readCrossTabServerBuild();
  if (!stored) return null;
  if (!isNewBuildAvailable(currentCommit, stored.commit)) {
    clearCrossTabServerBuild();
    return null;
  }
  return stored;
}

export function useAppVersionCheck() {
  const currentVersion = APP_VERSION;
  const currentCommit = APP_COMMIT;

  const [serverBuild, setServerBuild] = useState<ServerBuild | null>(() =>
    resolveSeededServerBuild(currentCommit),
  );
  const [dismissedCommit, setDismissedCommit] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  const applyDetectedBuild = useCallback(
    (build: ServerBuild) => {
      setServerBuild(build);
      if (isNewBuildAvailable(currentCommit, build.commit)) {
        persistCrossTabServerBuild(build, currentCommit);
      } else {
        clearCrossTabServerBuild();
      }
    },
    [currentCommit],
  );

  const check = useCallback(async () => {
    const next = await fetchServerBuild();
    if (next) applyDetectedBuild(next);
  }, [applyDetectedBuild]);

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
      if (e.key !== CROSS_TAB_SERVER_BUILD_KEY) return;
      if (e.newValue == null) {
        void check();
        return;
      }
      let parsed: ServerBuild | null = null;
      try {
        parsed = parseServerBuild(JSON.parse(e.newValue));
      } catch {
        parsed = null;
      }
      if (!parsed) return;
      if (isNewBuildAvailable(currentCommit, parsed.commit)) {
        setServerBuild(parsed);
      } else {
        clearCrossTabServerBuild();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [currentCommit, check]);

  const updateDetected = isNewBuildAvailable(currentCommit, serverBuild?.commit ?? null);
  const updateAvailable = updateDetected && serverBuild?.commit !== dismissedCommit;

  const dismiss = useCallback(() => {
    if (!serverBuild) return;
    try {
      sessionStorage.setItem(DISMISS_KEY, serverBuild.commit);
    } catch {
      /* ignore */
    }
    setDismissedCommit(serverBuild.commit);
  }, [serverBuild]);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    updateAvailable,
    currentVersion,
    // Release Version wyłącznie do prezentacji w bannerze (nigdy commit).
    serverVersion: serverBuild?.version ?? null,
    dismiss,
    reload,
  };
}
