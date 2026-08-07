/**
 * Validation Expert — agregacja verdict (LOCKED polityka Soft limit=3).
 */

import { SOFT_FINDINGS_VALIDATED_MAX } from "./types";
import type { ValidationFinding, ValidationVerdict } from "./types";
import { filterHard, filterSoft } from "./findings";

export function computeVerdict(findings: ValidationFinding[]): {
  verdict: ValidationVerdict;
  hardCount: number;
  softCount: number;
  softLimit: number;
} {
  const hardCount = filterHard(findings).length;
  const softCount = filterSoft(findings).length;
  const softLimit = SOFT_FINDINGS_VALIDATED_MAX;

  let verdict: ValidationVerdict;
  if (hardCount >= 1) {
    verdict = "blocked";
  } else if (softCount > softLimit) {
    verdict = "needs_review";
  } else {
    verdict = "validated";
  }

  return { verdict, hardCount, softCount, softLimit };
}

export function buildSummaryPl(opts: {
  verdict: ValidationVerdict;
  hardCount: number;
  softCount: number;
  softLimit: number;
}): string {
  const { verdict, hardCount, softCount, softLimit } = opts;
  if (verdict === "blocked") {
    return `Walidacja zablokowana: ${hardCount} Hard Finding(s), Soft=${softCount}. Kosztorys nieuznany za zweryfikowany jakościowo.`;
  }
  if (verdict === "needs_review") {
    return `Wymaga przeglądu Decydenta: Hard=0, Soft=${softCount} (limit validated=${softLimit}).`;
  }
  return `Kosztorys zweryfikowany: Hard=0, Soft=${softCount} ≤ ${softLimit}.`;
}
