/**
 * Completeness KPI — ATH classification % ≠ IK analysis completeness %.
 */

import type { IkFullWalkTenderLedger } from "./types";

export type AthClassificationKpi = {
  kind: "ATH_CLASSIFICATION_PCT";
  pricedOrClassified: number;
  total: number;
  pct: number;
  labelPl: string;
};

export type IkAnalysisCompletenessKpi = {
  kind: "IK_ANALYSIS_COMPLETENESS_PCT";
  visited: number;
  positionComplete: number;
  total: number;
  /** visited/total — processed, not priced */
  processedPct: number;
  /** positionComplete/total — priced/complete */
  completePct: number;
  labelPl: string;
  disclaimerPl: string;
};

export function buildAthClassificationKpi(
  classified: number,
  total: number,
): AthClassificationKpi {
  const t = Math.max(0, total);
  const c = Math.max(0, Math.min(classified, t));
  const pct = t > 0 ? Math.round((c / t) * 100) : 0;
  return {
    kind: "ATH_CLASSIFICATION_PCT",
    pricedOrClassified: c,
    total: t,
    pct,
    labelPl: `Mapowanie ATH → Biblioteka ${c}/${t} (${pct}%)`,
  };
}

export function buildIkAnalysisCompletenessKpi(
  ledger: IkFullWalkTenderLedger | null | undefined,
): IkAnalysisCompletenessKpi {
  const total = ledger?.counts.total ?? 0;
  const visited = ledger?.counts.visited ?? 0;
  const complete = ledger?.counts.complete ?? 0;
  const processedPct = total > 0 ? Math.round((visited / total) * 100) : 0;
  const completePct = total > 0 ? Math.round((complete / total) * 100) : 0;
  return {
    kind: "IK_ANALYSIS_COMPLETENESS_PCT",
    visited,
    positionComplete: complete,
    total,
    processedPct,
    completePct,
    labelPl: `Kompletność analizy IK ${complete}/${total} complete · ${visited}/${total} processed`,
    disclaimerPl:
      "Processed ≠ priced. ATH classification % nie jest pełną wyceną IK.",
  };
}
