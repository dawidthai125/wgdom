/**
 * NG-TENDERS-DOCUMENT-INTELLIGENCE-01 — evidence accumulation (COND-8j / 8j-d).
 * Evidence = strength only; numeric scoring stays in Ranking.
 */

import type { DiEvidence, EvidencePolarity, EvidenceSource, EvidenceStrength } from "./types";
import { DI_EVIDENCE_MAX } from "./types";

let _seq = 0;

export function resetDiEvidenceSeqForTests(): void {
  _seq = 0;
}

export function createEvidence(input: {
  source: EvidenceSource;
  polarity: EvidencePolarity;
  evidenceStrength: EvidenceStrength;
  summary: string;
  detail?: string;
  atPass: string;
}): DiEvidence {
  _seq += 1;
  return {
    id: `di-ev-${_seq}`,
    source: input.source,
    polarity: input.polarity,
    evidenceStrength: input.evidenceStrength,
    summary: input.summary,
    detail: input.detail,
    atPass: input.atPass,
  };
}

export function appendEvidence(
  bag: DiEvidence[],
  item: DiEvidence | null | undefined,
): DiEvidence[] {
  if (!item) return bag;
  if (bag.length >= DI_EVIDENCE_MAX) return bag;
  return [...bag, item];
}

export function appendEvidenceMany(
  bag: DiEvidence[],
  items: readonly (DiEvidence | null | undefined)[],
): DiEvidence[] {
  let next = bag;
  for (const it of items) {
    next = appendEvidence(next, it);
  }
  return next;
}

export function strengthRank(s: EvidenceStrength): number {
  if (s === "HIGH") return 3;
  if (s === "MEDIUM") return 2;
  return 1;
}

/** Soft fold for UI/explain — not used as Ranking weight (8j-d). */
export function summarizeEvidencePolarity(bag: readonly DiEvidence[]): {
  supportHigh: number;
  contradictHigh: number;
  supportCount: number;
  contradictCount: number;
} {
  let supportHigh = 0;
  let contradictHigh = 0;
  let supportCount = 0;
  let contradictCount = 0;
  for (const e of bag) {
    if (e.polarity === "support") {
      supportCount += 1;
      if (e.evidenceStrength === "HIGH") supportHigh += 1;
    } else if (e.polarity === "contradict") {
      contradictCount += 1;
      if (e.evidenceStrength === "HIGH") contradictHigh += 1;
    }
  }
  return { supportHigh, contradictHigh, supportCount, contradictCount };
}
