/**
 * NG10-HOTFIX-02 — gate exit SSOT (happy / organic partial / timeout partial).
 * Nie mutuje deriveAutonomousPipelineComplete — tylko równoległa ścieżka wyjścia S1.
 */

import { isDocumentDiscoverySettled } from "@/lib/tender-document-discovery";
import type { TenderDecision } from "@/lib/tenders-strategy-decision";
import {
  deriveAutonomousRunComplete,
  deriveAutonomousScoringReady,
  type DeriveAutonomousRunPhaseInput,
} from "@/lib/tender-autonomous-run-phase";
import { AUTONOMOUS_RUN_MAX_MS } from "@/lib/tender-autonomous-run-ux";

export type AutonomousGateOutcomeMode = "complete" | "partial";
export type AutonomousGatePartialReason = "organic" | "timeout";

export function deriveAutonomousRunTimeoutExceeded(elapsedMs: number): boolean {
  return elapsedMs >= AUTONOMOUS_RUN_MAX_MS;
}

function resolveDisplayDecision(
  input: DeriveAutonomousRunPhaseInput,
): TenderDecision | null {
  const decision = input.intelligenceCtx?.overlay.displayDecision;
  return decision ?? null;
}

/** Design Freeze §6.1 — organic partial (0 docs / kosztorys not_found / HOLD|NO-GO). */
export function deriveAutonomousOutcomePartialEligible(
  input: DeriveAutonomousRunPhaseInput,
): boolean {
  if (deriveAutonomousRunComplete(input)) return false;
  if (!deriveAutonomousScoringReady(input)) return false;
  if (!isDocumentDiscoverySettled(input.item)) return false;

  const decision = resolveDisplayDecision(input);
  if (decision !== "HOLD" && decision !== "NO-GO") return false;

  const trustOverall = input.trustAssessment?.overall;
  if (trustOverall === "unknown" || trustOverall == null) return false;

  return true;
}

/** HOTFIX-02 — timeout escape bez discoverySettled; wymaga displayDecision. */
export function deriveAutonomousRunTimeoutPartialEligible(
  input: DeriveAutonomousRunPhaseInput,
  elapsedMs: number,
): boolean {
  if (deriveAutonomousRunComplete(input)) return false;
  if (!deriveAutonomousScoringReady(input)) return false;
  if (resolveDisplayDecision(input) == null) return false;
  if (!deriveAutonomousRunTimeoutExceeded(elapsedMs)) return false;
  return true;
}

export function deriveAutonomousGateExitReady(opts: {
  input: DeriveAutonomousRunPhaseInput;
  elapsedMs: number;
  minDisplayElapsed: boolean;
}): {
  ready: boolean;
  outcomeMode: AutonomousGateOutcomeMode | null;
  partialReason: AutonomousGatePartialReason | null;
} {
  const { input, elapsedMs, minDisplayElapsed } = opts;
  if (!minDisplayElapsed) {
    return { ready: false, outcomeMode: null, partialReason: null };
  }

  if (deriveAutonomousRunComplete(input)) {
    return { ready: true, outcomeMode: "complete", partialReason: null };
  }

  if (deriveAutonomousOutcomePartialEligible(input)) {
    return { ready: true, outcomeMode: "partial", partialReason: "organic" };
  }

  if (deriveAutonomousRunTimeoutPartialEligible(input, elapsedMs)) {
    return { ready: true, outcomeMode: "partial", partialReason: "timeout" };
  }

  return { ready: false, outcomeMode: null, partialReason: null };
}
