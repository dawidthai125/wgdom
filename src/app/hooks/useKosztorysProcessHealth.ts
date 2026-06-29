/**
 * P2 — obserwator aktywności procesu kosztorysu (prezentacja only).
 * Logika progów w tender-kosztorys-process-health.ts.
 */

import { useEffect, useRef, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import {
  deriveKosztorysProcessHealth,
  isKosztorysProcessHealthMonitored,
  resolveKosztorysTraceActivityMs,
  snapshotKosztorysActivityFingerprint,
  tickKosztorysActivityClock,
  type KosztorysProcessHealthView,
} from "@/lib/tender-kosztorys-process-health";

const DEFAULT_POLL_MS = 5_000;

export function useKosztorysProcessHealth(opts: {
  item: TenderPipelineItem;
  session: KosztorysProcessSession;
  retryNonce?: number;
  pollIntervalMs?: number;
  enabled?: boolean;
}): KosztorysProcessHealthView | null {
  const {
    item,
    session,
    retryNonce = 0,
    pollIntervalMs = DEFAULT_POLL_MS,
    enabled = true,
  } = opts;

  const [health, setHealth] = useState<KosztorysProcessHealthView | null>(null);
  const fingerprintRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const monitoringStartedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !isKosztorysProcessHealthMonitored(session, item)) {
      fingerprintRef.current = null;
      monitoringStartedRef.current = null;
      setHealth(null);
      return;
    }

    const now = Date.now();
    if (monitoringStartedRef.current == null) {
      monitoringStartedRef.current = now;
      lastActivityRef.current = now;
      fingerprintRef.current = null;
    }

    const recompute = () => {
      const nowMs = Date.now();
      const fingerprint = snapshotKosztorysActivityFingerprint(item, session, retryNonce);
      const monitoringStartedAtMs = monitoringStartedRef.current ?? nowMs;
      const traceActivityMs = resolveKosztorysTraceActivityMs();

      lastActivityRef.current = tickKosztorysActivityClock({
        nowMs,
        fingerprint,
        prevFingerprint: fingerprintRef.current,
        prevLastActivityAtMs: lastActivityRef.current,
        monitoringStartedAtMs,
        traceActivityMs,
      });
      fingerprintRef.current = fingerprint;

      setHealth(
        deriveKosztorysProcessHealth({
          item,
          session,
          lastActivityAtMs: lastActivityRef.current,
          monitoringStartedAtMs,
          nowMs,
          retryNonce,
        }),
      );
    };

    recompute();
    const id = window.setInterval(recompute, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [
    enabled,
    item,
    session.autoRunning,
    session.dossierBuilding,
    session.dossierSaving,
    session.dossierParseFailed,
    session.lazyEnabled,
    retryNonce,
    pollIntervalMs,
  ]);

  return health;
}

/** Test-only reset stanu hooka — nie używać w prod UI. */
export function resetKosztorysProcessHealthHookForTests(): void {
  /* hook state is per-instance; tests use pure deriveKosztorysProcessHealth */
}
