/**
 * COND-2 — Coverage + escalate (weak-positive → full-text ≤M=3; cap_skip explain).
 */

import { createEvidence } from "./evidence";
import type { DiEvidence } from "./types";
import { DI_ESCALATE_MAX, DI_PASS2_CAP, DI_T_BOQ } from "./types";

export interface CoverageDecision {
  pass2: boolean;
  escalateFullText: boolean;
  skippedByCap: boolean;
  reason: string;
  evidence: DiEvidence | null;
}

/**
 * Pure policy: whether this candidate should enter Pass-2 / escalate.
 * Cap accounting is done by caller with global counters.
 */
export function decideCoverage(input: {
  filenamePriority: "boost" | "neutral" | "penalty";
  overallAfterPass1ish: number;
  pass2Used: number;
  escalateUsed: number;
  sampledPages: number;
}): CoverageDecision {
  const weakPositive =
    input.overallAfterPass1ish >= 0.35 && input.overallAfterPass1ish < DI_T_BOQ;

  if (input.filenamePriority === "boost" || input.overallAfterPass1ish >= 0.3) {
    if (input.pass2Used >= DI_PASS2_CAP) {
      return {
        pass2: false,
        escalateFullText: false,
        skippedByCap: true,
        reason: `cap_skip Pass-2 (K=${DI_PASS2_CAP})`,
        evidence: createEvidence({
          source: "Coverage",
          polarity: "neutral",
          evidenceStrength: "LOW",
          summary: `cap_skip Pass-2 K=${DI_PASS2_CAP}`,
          atPass: "P2-cap",
        }),
      };
    }
  }

  const pass2 =
    input.filenamePriority === "boost" ||
    input.overallAfterPass1ish >= 0.25 ||
    input.sampledPages > 0;

  let escalateFullText = false;
  if (weakPositive && input.sampledPages > 0 && input.sampledPages <= 3) {
    if (input.escalateUsed < DI_ESCALATE_MAX) {
      escalateFullText = true;
    }
  }

  return {
    pass2,
    escalateFullText,
    skippedByCap: false,
    reason: escalateFullText
      ? `escalate full-text (M≤${DI_ESCALATE_MAX})`
      : pass2
        ? "Pass-2 content sample"
        : "skip Pass-2",
    evidence: escalateFullText
      ? createEvidence({
          source: "Coverage",
          polarity: "support",
          evidenceStrength: "MEDIUM",
          summary: "Weak-positive escalate to fuller text",
          atPass: "P2-escalate",
        })
      : null,
  };
}
