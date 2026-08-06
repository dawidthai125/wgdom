/**
 * Pass-8 Explainability bundle (COND-4 mandatory).
 */

import type { DiEvidence, ExplainabilityBundle } from "./types";
import { DI_T_BOQ } from "./types";

export function buildExplainability(input: {
  evidence: readonly DiEvidence[];
  overall: number;
  recommendedParser: string;
  negativeReasons: readonly string[];
  rankingReasons: readonly string[];
}): ExplainabilityBundle {
  const chosenBecause: string[] = [];
  const rejectedBecause: string[] = [];
  const confidenceReasons: string[] = [];

  for (const e of input.evidence) {
    if (e.polarity === "support") chosenBecause.push(e.summary);
    if (e.polarity === "contradict") rejectedBecause.push(e.summary);
  }

  confidenceReasons.push(`overall=${input.overall.toFixed(2)} vs T_BOQ=${DI_T_BOQ}`);
  confidenceReasons.push(`parser=${input.recommendedParser}`);

  if (input.overall < DI_T_BOQ && input.recommendedParser === "none") {
    rejectedBecause.push("Below T_BOQ — no parser selected");
  }

  return {
    chosenBecause: chosenBecause.slice(0, 12),
    rejectedBecause: rejectedBecause.slice(0, 12),
    negativeReasons: [...input.negativeReasons].slice(0, 8),
    rankingReasons: [...input.rankingReasons].slice(0, 8),
    confidenceReasons: confidenceReasons.slice(0, 8),
  };
}
