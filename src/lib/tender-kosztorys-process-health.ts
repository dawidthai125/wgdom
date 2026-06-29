/**
 * P2 UX — SSOT zdrowia procesu kosztorysu (E12 timeout / stale, prezentacja only).
 */
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { getDossierTraceLog } from "@/lib/tender-dossier-trace";
import {
  deriveKosztorysProcessPhase,
  deriveKosztorysTechnicalPhase,
  type KosztorysProcessPhaseView,
  type KosztorysProcessSession,
  type KosztorysTechnicalPhaseId,
} from "@/lib/tender-kosztorys-process-phase";

export type KosztorysProcessHealthStatus = "healthy" | "slow" | "stale" | "timeout";

export const KOSZTORYS_HEALTH_SLOW_MS = 30_000;
export const KOSZTORYS_HEALTH_STALE_MS = 90_000;
export const KOSZTORYS_HEALTH_TIMEOUT_MS = 180_000;

export const KOSZTORYS_HEALTH_SLOW_MESSAGE = "Analiza trwa dłużej niż zwykle…";
export const KOSZTORYS_HEALTH_STALE_MESSAGE = "Wygląda na zatrzymaną analizę.";
export const KOSZTORYS_HEALTH_TIMEOUT_MESSAGE =
  "Analiza przekroczyła oczekiwany czas — możesz spróbować ponownie.";

export interface KosztorysProcessHealthView {
  status: KosztorysProcessHealthStatus;
  currentPhase: KosztorysProcessPhaseView;
  technicalPhase: KosztorysTechnicalPhaseId;
  inactivityMs: number;
  lastActivityAt: string;
  message: string | null;
  showRetry: boolean;
  /** Sygnał do session.parseStale → faza techniczna E12. */
  parseStale: boolean;
}

export interface KosztorysProcessHealthInput {
  item: TenderPipelineItem;
  session: KosztorysProcessSession;
  /** Ostatnia aktywność (trace / zmiana fazy / retry). */
  lastActivityAtMs: number;
  /** Start monitorowania bieżącej sesji w toku. */
  monitoringStartedAtMs: number;
  nowMs?: number;
  retryNonce?: number;
}

/** Proces w toku — monitorujemy health. */
export function isKosztorysProcessHealthMonitored(
  session: KosztorysProcessSession,
  item?: TenderPipelineItem,
): boolean {
  if (session.dossierParseFailed) return false;
  if (session.autoRunning || session.dossierBuilding || session.dossierSaving) return true;
  if (session.pipelineQueued) return true;
  if (item) {
    const { technicalId } = deriveKosztorysTechnicalPhase(item, session);
    if (technicalId === "e5") return true;
  }
  return false;
}

/** Fingerprint aktywności — zmiana resetuje licznik bezczynności. */
export function buildKosztorysActivityFingerprint(opts: {
  traceHeadAt?: string | null;
  traceHeadStep?: string | null;
  technicalPhaseKey: string;
  retryNonce?: number;
}): string {
  const parts = [
    opts.traceHeadAt ?? "",
    opts.traceHeadStep ?? "",
    opts.technicalPhaseKey,
    String(opts.retryNonce ?? 0),
  ];
  return parts.join("|");
}

export function resolveKosztorysTechnicalPhaseKey(
  item: TenderPipelineItem,
  session: KosztorysProcessSession,
): string {
  const { technicalId, e6Sub } = deriveKosztorysTechnicalPhase(item, session);
  return e6Sub ? `${technicalId}:${e6Sub}` : technicalId;
}

/** Ostatni timestamp z trace (ms) lub null. */
export function resolveKosztorysTraceActivityMs(
  trace = getDossierTraceLog(),
): number | null {
  const head = trace[0];
  if (!head?.at) return null;
  const ms = Date.parse(head.at);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Aktualizacja zegara aktywności — wywoływane gdy fingerprint lub trace się zmienia.
 * Logika poza komponentami React (hook tylko woła tę funkcję).
 */
export function tickKosztorysActivityClock(opts: {
  nowMs: number;
  fingerprint: string;
  prevFingerprint: string | null;
  prevLastActivityAtMs: number;
  monitoringStartedAtMs: number;
  traceActivityMs: number | null;
}): number {
  const {
    nowMs,
    fingerprint,
    prevFingerprint,
    prevLastActivityAtMs,
    monitoringStartedAtMs,
    traceActivityMs,
  } = opts;

  if (prevFingerprint == null || fingerprint !== prevFingerprint) {
    if (traceActivityMs != null && traceActivityMs <= nowMs) {
      return Math.max(traceActivityMs, monitoringStartedAtMs);
    }
    return nowMs;
  }

  if (
    traceActivityMs != null
    && traceActivityMs > prevLastActivityAtMs
    && traceActivityMs <= nowMs
  ) {
    return traceActivityMs;
  }

  return prevLastActivityAtMs;
}

function classifyInactivity(inactivityMs: number): KosztorysProcessHealthStatus {
  if (inactivityMs >= KOSZTORYS_HEALTH_TIMEOUT_MS) return "timeout";
  if (inactivityMs >= KOSZTORYS_HEALTH_STALE_MS) return "stale";
  if (inactivityMs >= KOSZTORYS_HEALTH_SLOW_MS) return "slow";
  return "healthy";
}

function healthMessage(status: KosztorysProcessHealthStatus): string | null {
  switch (status) {
    case "slow":
      return KOSZTORYS_HEALTH_SLOW_MESSAGE;
    case "stale":
      return KOSZTORYS_HEALTH_STALE_MESSAGE;
    case "timeout":
      return KOSZTORYS_HEALTH_TIMEOUT_MESSAGE;
    default:
      return null;
  }
}

/** SSOT — stan zdrowia procesu (pure, testowalne). */
export function deriveKosztorysProcessHealth(
  input: KosztorysProcessHealthInput,
): KosztorysProcessHealthView | null {
  const {
    item,
    session,
    lastActivityAtMs,
    monitoringStartedAtMs,
    nowMs = Date.now(),
    retryNonce = 0,
  } = input;

  if (!isKosztorysProcessHealthMonitored(session, item)) {
    return null;
  }

  const inactivityMs = Math.max(0, nowMs - Math.max(lastActivityAtMs, monitoringStartedAtMs));
  const status = classifyInactivity(inactivityMs);
  const parseStale = status === "stale" || status === "timeout";

  const technical = deriveKosztorysTechnicalPhase(item, {
    ...session,
    parseStale,
  });
  const currentPhase = deriveKosztorysProcessPhase(item, {
    ...session,
    parseStale,
  });

  const message = healthMessage(status);
  const showRetry = (status === "stale" || status === "timeout") && !session.dossierParseFailed;

  return {
    status,
    currentPhase: applyKosztorysHealthToPhaseView(currentPhase, status, message, showRetry),
    technicalPhase: technical.technicalId,
    inactivityMs,
    lastActivityAt: new Date(lastActivityAtMs).toISOString(),
    message,
    showRetry,
    parseStale,
  };
}

/** Nakłada komunikaty health na widok fazy — bez zmiany pipeline. */
export function applyKosztorysHealthToPhaseView(
  phase: KosztorysProcessPhaseView,
  status: KosztorysProcessHealthStatus,
  message: string | null,
  showRetry: boolean,
): KosztorysProcessPhaseView {
  if (status === "healthy" || !message) {
    return phase;
  }

  const next: KosztorysProcessPhaseView = {
    ...phase,
    hint: message,
    tone: status === "timeout" ? "warning" : phase.tone,
  };

  if (status === "timeout") {
    next.technicalId = "e12";
  }

  if (showRetry && !phase.showRetry) {
    next.showRetry = true;
  }

  return next;
}

/** Buduje fingerprint z bieżących sygnałów (dla hooka). */
export function snapshotKosztorysActivityFingerprint(
  item: TenderPipelineItem,
  session: KosztorysProcessSession,
  retryNonce = 0,
): string {
  const trace = getDossierTraceLog();
  return buildKosztorysActivityFingerprint({
    traceHeadAt: trace[0]?.at ?? null,
    traceHeadStep: trace[0]?.step ?? null,
    technicalPhaseKey: resolveKosztorysTechnicalPhaseKey(item, session),
    retryNonce,
  });
}
