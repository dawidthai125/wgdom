/**
 * P2-E.1 — warstwa confidence dla metadanych przetargu (wartość, kryteria, wadium).
 */

import type { TenderAwardCriterion } from "@/lib/tenders-bzp-fit";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { isWeakWadiumRaw } from "@/lib/tenders-bzp-swz";

export const METADATA_CONFIDENCE_THRESHOLD = 0.55;

const FALSE_CRITERION_NAME_RE = [
  /^vat\b/i,
  /\bvat\s*\d/i,
  /dokładności/i,
  /miejsc po przecinku/i,
  /zaokrągl/i,
  /preferencj/i,
  /rachunkow/i,
  /podatku/i,
  /stawka\s*vat/i,
  /stawka obni/i,
  /obniżon/i,
];

const RELIABLE_CRITERION_NAME_RE =
  /cen|termin|gwarancj|jakość|jakości|okres|realizac|doświadczen|personel|środowisk|bezpieczeństw|parametr|ofert/i;

export function isFalsePositiveCriterion(c: TenderAwardCriterion): boolean {
  const name = c.name.trim();
  if (FALSE_CRITERION_NAME_RE.some((re) => re.test(name))) return true;
  if (c.weightPct === 0) return true;
  if (c.weightPct != null && c.weightPct < 1) return true;
  if (c.weightPct != null && c.weightPct <= 23 && !RELIABLE_CRITERION_NAME_RE.test(name)) {
    if (/^\d/.test(name) || name.length < 6) return true;
  }
  if (/^z\s+dokładnością/i.test(name)) return true;
  return false;
}

export function filterReliableAwardCriteria(
  criteria: TenderAwardCriterion[],
): TenderAwardCriterion[] {
  return criteria.filter((c) => !isFalsePositiveCriterion(c));
}

export function scoreEstimatedValueConfidence(opts: {
  valuePln: number | null;
  valueRaw: string | null | undefined;
  sourceFilename?: string | null;
}): number {
  const { valuePln, valueRaw, sourceFilename } = opts;
  if (valuePln == null) return 0;
  const raw = (valueRaw ?? "").toLowerCase();
  if (/wartość zamówienia|szacunkow|całkowit|przewidywan/i.test(raw)) return 0.92;
  if (/stwior|opz|kosztorys|przedmiar/i.test(sourceFilename ?? "")) return 0.78;
  if (valuePln < 1_000 && !/tys|mln|000/.test(raw)) return 0.2;
  if (valuePln >= 10_000) return 0.75;
  return 0.6;
}

export function scoreWadiumConfidence(swz: Pick<TenderSwzAnalysis, "wadiumPln" | "wadiumPercent" | "wadiumRaw">): number {
  if (swz.wadiumPln != null && swz.wadiumPln > 0) return 0.85;
  if (swz.wadiumPercent != null && swz.wadiumPercent >= 1 && swz.wadiumPercent <= 20) return 0.8;
  if (swz.wadiumRaw && !isWeakWadiumRaw(swz.wadiumRaw)) return 0.7;
  if (isWeakWadiumRaw(swz.wadiumRaw)) return 0.15;
  return 0;
}

export function scoreCriteriaConfidence(criteria: TenderAwardCriterion[]): number {
  const reliable = filterReliableAwardCriteria(criteria);
  if (reliable.length === 0) return 0;
  const totalWeight = reliable.reduce((s, c) => s + (c.weightPct ?? 0), 0);
  if (reliable.length >= 2 && totalWeight >= 90 && totalWeight <= 110) return 0.95;
  if (reliable.length >= 1 && reliable.some((c) => c.weightPct != null)) return 0.82;
  if (reliable.length >= 1) return 0.65;
  return 0;
}

/** Usuwa niskiej jakości ekstrakcje — UI pokaże „Nie wykryto”. */
export function applyMetadataConfidence(analysis: TenderSwzAnalysis): TenderSwzAnalysis {
  const awardCriteria = filterReliableAwardCriteria(analysis.awardCriteria ?? []);
  const criteriaConf = scoreCriteriaConfidence(awardCriteria);

  const valueConf = scoreEstimatedValueConfidence({
    valuePln: analysis.estimatedValuePln,
    valueRaw: analysis.estimatedValueRaw,
    sourceFilename: analysis.sourceFilename,
  });

  const reliableValue = valueConf >= METADATA_CONFIDENCE_THRESHOLD && analysis.estimatedValuePln != null;

  let wadiumPln = analysis.wadiumPln;
  let wadiumPercent = analysis.wadiumPercent;
  let wadiumRaw = analysis.wadiumRaw;

  // P2-E.1B — bez wiarygodnej wartości nie trzymamy pochodnego wadiumPln (np. 6 zł z 6% × 100)
  if (wadiumPercent != null && !reliableValue) {
    wadiumPln = null;
  }
  if (wadiumPln != null && wadiumPln < 100) {
    wadiumPln = null;
  }
  if (wadiumPercent != null && reliableValue && wadiumPln == null && analysis.estimatedValuePln != null) {
    wadiumPln = Math.round(analysis.estimatedValuePln * wadiumPercent / 100);
  }

  const wadiumForScore = { wadiumPln, wadiumPercent, wadiumRaw };
  const wadiumConf = scoreWadiumConfidence(wadiumForScore);

  return {
    ...analysis,
    estimatedValuePln: reliableValue ? analysis.estimatedValuePln : null,
    estimatedValueRaw: valueConf >= METADATA_CONFIDENCE_THRESHOLD ? analysis.estimatedValueRaw : null,
    awardCriteria: criteriaConf >= METADATA_CONFIDENCE_THRESHOLD ? awardCriteria : [],
    wadiumPln: wadiumConf >= METADATA_CONFIDENCE_THRESHOLD ? wadiumPln : null,
    wadiumPercent: wadiumConf >= METADATA_CONFIDENCE_THRESHOLD ? wadiumPercent : null,
    wadiumRaw: wadiumConf >= METADATA_CONFIDENCE_THRESHOLD ? wadiumRaw : null,
  };
}
