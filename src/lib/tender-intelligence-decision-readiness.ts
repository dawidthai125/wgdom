/**
 * NG11-A5 — jawny split strategic (T0) vs economic (Q5) readiness.
 * Additive only — nie zmienia overlay.displayDecision (NG10 frozen).
 */

import type { TenderDecision, TenderScoringBundle } from "@/lib/tenders-strategy-decision";

export interface DeriveTenderDecisionReadinessInput {
  scoringBundle: TenderScoringBundle;
  /** SSOT z runtime `pricingReadyPartial`; default false gdy brak wire. */
  pricingReadyPartial?: boolean;
  /** SSOT z runtime `pricingReadyFinal`; default false gdy brak wire. */
  pricingReadyFinal?: boolean;
}

export interface TenderDecisionReadiness {
  /** Raw strategic decision (pre-overlay). */
  strategicDecision: TenderDecision;
  /** T0 scoring complete — zawsze true gdy bundle dostępny. */
  strategicDecisionReady: boolean;
  /** Economic partial — mapuje `pricingReadyPartial`. */
  economicDecisionReady: boolean;
  /** Economic final — mapuje `pricingReadyFinal`. */
  economicDecisionFinalReady: boolean;
}

export function deriveTenderDecisionReadiness(
  input: DeriveTenderDecisionReadinessInput,
): TenderDecisionReadiness {
  return {
    strategicDecision: input.scoringBundle.decision,
    strategicDecisionReady: true,
    economicDecisionReady: input.pricingReadyPartial === true,
    economicDecisionFinalReady: input.pricingReadyFinal === true,
  };
}
