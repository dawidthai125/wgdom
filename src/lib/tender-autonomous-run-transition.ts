/**
 * NG10-UX-03 — Transition + Timeout (prezentacja only).
 * SSOT: docs/architecture/NG10-AUTONOMOUS-AGENT-UX-DESIGN-FREEZE.md §6–7
 */

import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import { isDocumentDiscoverySettled } from "@/lib/tender-document-discovery";
import type { AutonomousGatePartialReason } from "@/lib/tender-autonomous-run-gate-exit";
import type { AutonomousActivityEvent, DeriveAutonomousRunPhaseInput } from "@/lib/tender-autonomous-run-phase";
import { AUTONOMOUS_RUN_MAX_MS } from "@/lib/tender-autonomous-run-ux";
import { PipelineState } from "@/lib/tender-pipeline/tender-pipeline-types";

export const AUTONOMOUS_TIMEOUT_BAR_VISIBLE_AFTER_MS = 30_000;
export const AUTONOMOUS_TIMEOUT_T30_BEFORE_MS = 30_000;
export const AUTONOMOUS_FAQ_AUTO_EXPAND_MS = 45_000;

export const AUTONOMOUS_COMPLETE_HOLD_TITLE = "✓ Analiza zakończona";
export const AUTONOMOUS_PARTIAL_HOLD_TITLE = "Analiza częściowa gotowa";
export const AUTONOMOUS_TRANSITION_PRESENTATION_SUBTITLE =
  "Przygotowuję prezentację wyników…";
export const AUTONOMOUS_TRANSITION_BRIDGE_MESSAGE =
  "Przygotowuję prezentację wyników…";

export const AUTONOMOUS_TIMEOUT_BAR_LABEL =
  "Maksymalny czas analizy automatycznej: ok. 2 minuty";
export const AUTONOMOUS_TIMEOUT_T30_MESSAGE =
  "Za chwilę przedstawię rekomendację na podstawie dostępnych danych.";

export type AutonomousPartialReasonLabel =
  | "timeout"
  | "discovery_pending"
  | "no_attachments"
  | "incomplete_pricing";

export const AUTONOMOUS_PARTIAL_REASON_CHIP: Record<AutonomousPartialReasonLabel, string> = {
  timeout: "Analiza częściowa (limit czasu)",
  discovery_pending: "Analiza częściowa (dokumenty w toku)",
  no_attachments: "Analiza wstępna (brak załączników)",
  incomplete_pricing: "Analiza częściowa (wycena w toku)",
};

export function deriveAutonomousExitSummary(feed: AutonomousActivityEvent[]): string[] {
  return feed
    .filter((entry) => entry.kind === "achievement")
    .slice(-3)
    .map((entry) => entry.message.replace(/^✓\s*/, "").trim())
    .filter((message) => message.length > 0);
}

export function deriveAutonomousPartialReasonLabel(opts: {
  gatePartialReason: AutonomousGatePartialReason | null;
  input: DeriveAutonomousRunPhaseInput;
  discoveryPending: boolean;
}): AutonomousPartialReasonLabel | null {
  if (opts.gatePartialReason == null) return null;

  if (opts.gatePartialReason === "timeout") {
    if (opts.discoveryPending || !isDocumentDiscoverySettled(opts.input.item)) {
      return "discovery_pending";
    }
    return "timeout";
  }

  if (
    isDocumentDiscoverySettled(opts.input.item)
    && countTenderAttachments(opts.input.item) === 0
  ) {
    return "no_attachments";
  }

  if (
    opts.input.pipelineState === PipelineState.Pricing
    || opts.input.autoRunning
    || opts.input.dossierBuilding
    || opts.input.dossierSaving
  ) {
    return "incomplete_pricing";
  }

  return "incomplete_pricing";
}

export function shouldShowAutonomousTimeoutBar(elapsedMs: number, runComplete: boolean): boolean {
  return !runComplete && elapsedMs >= AUTONOMOUS_TIMEOUT_BAR_VISIBLE_AFTER_MS;
}

export function deriveAutonomousTimeoutProgress(elapsedMs: number): {
  percent: number;
  elapsedSeconds: number;
  maxSeconds: number;
} {
  const maxSeconds = AUTONOMOUS_RUN_MAX_MS / 1000;
  const elapsedSeconds = Math.min(maxSeconds, Math.max(0, Math.floor(elapsedMs / 1000)));
  const percent = Math.min(100, Math.round((elapsedMs / AUTONOMOUS_RUN_MAX_MS) * 100));
  return { percent, elapsedSeconds, maxSeconds };
}

export function deriveAutonomousTimeoutT30Message(
  elapsedMs: number,
  runComplete: boolean,
): string | null {
  if (runComplete) return null;
  const threshold = AUTONOMOUS_RUN_MAX_MS - AUTONOMOUS_TIMEOUT_T30_BEFORE_MS;
  if (elapsedMs < threshold) return null;
  return AUTONOMOUS_TIMEOUT_T30_MESSAGE;
}

/** OD-UX-4 — ukryj legacy ETA gdy timeline lub timeout bar aktywny. */
export function shouldHideLegacyAutonomousEta(opts: {
  showTimeline: boolean;
  elapsedMs: number;
  runComplete: boolean;
}): boolean {
  return opts.showTimeline || shouldShowAutonomousTimeoutBar(opts.elapsedMs, opts.runComplete);
}

export function shouldAutoExpandAutonomousFaq(elapsedMs: number, runComplete: boolean): boolean {
  return !runComplete && elapsedMs > AUTONOMOUS_FAQ_AUTO_EXPAND_MS;
}

export function formatAutonomousTimeoutElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
