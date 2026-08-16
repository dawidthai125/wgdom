/**
 * IK-MIGRATION-01 P5 — build InternalFirstCatalogRow[] from CatalogWork (REUSE P5.26-E shape).
 * ZERO HTTP · ZERO Accept · ZERO invent.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import type { InternalFirstCatalogRow } from "./internal-first-semantic-match";
import type { InternalFirstPriceDomain } from "./internal-first-domain";

function isProductLikeId(id: string): boolean {
  return /^(mat-|pm-|product-|material-)/i.test(id) || /material/i.test(id);
}

function classifyCatalogWorkDomain(work: CatalogWork): InternalFirstPriceDomain {
  if (isProductLikeId(work.id)) return "MATERIAL";
  const split = work.costSplit;
  if (split && split.materialRatio >= 0.85 && split.laborRatio <= 0.15) return "MATERIAL";
  if (split && split.laborRatio >= 0.85 && split.materialRatio <= 0.15) return "LABOR";
  if (split && split.materialRatio >= 0.25 && split.laborRatio >= 0.25) {
    return "LABOR_MATERIAL_PACKAGE";
  }
  if (work.ourWorkRate?.ourRatePln != null && work.ourWorkRate.ourRatePln > 0) return "LABOR";
  return "UNKNOWN";
}

/** Catalog index for lookupInternalFirst — LABOR/PACKAGE rates preferred. */
export function buildInternalFirstIndexFromCatalogWorks(
  works: CatalogWork[],
): InternalFirstCatalogRow[] {
  const out: InternalFirstCatalogRow[] = [];
  for (const work of works) {
    const classHint = classifyCatalogWorkDomain(work);
    const our = work.ourWorkRate?.ourRatePln;
    const base =
      Number.isFinite(our) && our != null && our > 0 ? our : null;
    if (base == null) continue;
    out.push({
      id: work.id,
      namePl: work.namePl || work.id,
      unit: work.unit,
      classHint,
      base,
      baseKind: "OUR_RATE",
      keywords: work.keywords ?? [],
      descriptionPl: work.descriptionPl,
      work: {
        id: work.id,
        namePl: work.namePl,
        keywords: work.keywords ?? [],
        descriptionPl: work.descriptionPl,
      },
    });
  }
  return out;
}
