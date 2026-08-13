/**
 * MULTI-BOQ-01 — role / eligibility helpers (filename = HINT only, never dwellingId).
 */

import { classifyCostDocumentType } from "@/lib/tender-cost-discovery";
import { inferBranchHint } from "@/lib/cost-multi-01-classify";
import type { DwellingCostBranchHint } from "@/lib/multi-boq/types";

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/**
 * Project / helper docs — exclude from cost set even if Owner mapped,
 * unless filename clearly marks przedmiar/kosztorys.
 */
export function isNonCostHelperFilename(filename: string): boolean {
  const h = fold(filename);
  if (!h) return false;
  if (/przedmiar|kosztorys|obmiar|\.ath\b|\.nor\b/.test(h)) return false;
  if (/projekt|dokumentacja\s+projekt|schemat|rzut\b|opinia|powierzchn/.test(h)) {
    return true;
  }
  return false;
}

export function isCostEligibleFilename(filename: string): boolean {
  if (isNonCostHelperFilename(filename)) return false;
  const t = classifyCostDocumentType(filename).type;
  if (t !== "none") return true;
  // Owner-mapped unknown ext with usable snapshot still allowed at resolve (snapshot.ok).
  return false;
}

export function branchHintForFilename(filename: string): DwellingCostBranchHint {
  return inferBranchHint(filename);
}
