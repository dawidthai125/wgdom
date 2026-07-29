/**
 * CENY-MATERIAŁÓW-01 · CM-0 — KPI share originów materiałów (pure).
 * DF K1–K4 · bez I/O · bez zmiany wyceny.
 */

import type { OfferBoqDocument, OfferBoqPriceOriginKind } from "@/lib/tender-offer-boq";

export type MaterialOriginShareKind =
  | "controlled_market"
  | "work_catalog"
  | "category_rate"
  | "heuristic_estimate"
  | "company_knowledge"
  | "other";

export interface MaterialOriginShareBucket {
  kind: MaterialOriginShareKind;
  componentCount: number;
  totalPln: number;
  pctOfMaterialPln: number;
  pctOfComponents: number;
}

export interface MaterialOriginShareSummary {
  materialComponentCount: number;
  materialTotalPln: number;
  buckets: Record<MaterialOriginShareKind, MaterialOriginShareBucket>;
  /** Convenience KPI mirrors (0–100). */
  controlledMarketPctPln: number;
  workCatalogPctPln: number;
  categoryRatePctPln: number;
  heuristicEstimatePctPln: number;
  catalogWorkIdLinePct: number;
  lineCount: number;
  linesWithCatalogWorkId: number;
}

const KPI_KINDS: MaterialOriginShareKind[] = [
  "controlled_market",
  "work_catalog",
  "category_rate",
  "heuristic_estimate",
  "company_knowledge",
  "other",
];

function emptyBucket(kind: MaterialOriginShareKind): MaterialOriginShareBucket {
  return { kind, componentCount: 0, totalPln: 0, pctOfMaterialPln: 0, pctOfComponents: 0 };
}

function mapKind(raw: OfferBoqPriceOriginKind | string | null | undefined): MaterialOriginShareKind {
  switch (raw) {
    case "controlled_market":
    case "work_catalog":
    case "category_rate":
    case "heuristic_estimate":
    case "company_knowledge":
      return raw;
    default:
      return "other";
  }
}

function isMaterialComponent(category: string | null | undefined, namePl: string | null | undefined): boolean {
  const cat = String(category ?? "").toLowerCase();
  if (cat === "material") return true;
  return /mater/.test(String(namePl ?? "").toLowerCase());
}

function pct(part: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/**
 * Agreguje share originów wyłącznie dla komponentów materiałowych OfferBoq.
 */
export function computeMaterialOriginShareSummary(
  doc: OfferBoqDocument | null | undefined,
): MaterialOriginShareSummary {
  const buckets = Object.fromEntries(KPI_KINDS.map((k) => [k, emptyBucket(k)])) as Record<
    MaterialOriginShareKind,
    MaterialOriginShareBucket
  >;

  let materialComponentCount = 0;
  let materialTotalPln = 0;
  const lines = doc?.lines ?? [];
  let linesWithCatalogWorkId = 0;

  for (const line of lines) {
    if (line.catalogWorkId) linesWithCatalogWorkId += 1;
    const comps = line.linePricing?.components ?? [];
    for (const c of comps) {
      if (!isMaterialComponent(c.category as string | undefined, c.namePl)) continue;
      materialComponentCount += 1;
      const pln = typeof c.totalPln === "number" && Number.isFinite(c.totalPln) ? c.totalPln : 0;
      materialTotalPln += pln;
      const kind = mapKind(c.priceOrigin?.kind);
      buckets[kind].componentCount += 1;
      buckets[kind].totalPln += pln;
    }
  }

  for (const k of KPI_KINDS) {
    buckets[k].pctOfMaterialPln = pct(buckets[k].totalPln, materialTotalPln);
    buckets[k].pctOfComponents = pct(buckets[k].componentCount, materialComponentCount);
    buckets[k].totalPln = Math.round(buckets[k].totalPln * 100) / 100;
  }

  return {
    materialComponentCount,
    materialTotalPln: Math.round(materialTotalPln * 100) / 100,
    buckets,
    controlledMarketPctPln: buckets.controlled_market.pctOfMaterialPln,
    workCatalogPctPln: buckets.work_catalog.pctOfMaterialPln,
    categoryRatePctPln: buckets.category_rate.pctOfMaterialPln,
    heuristicEstimatePctPln: buckets.heuristic_estimate.pctOfMaterialPln,
    catalogWorkIdLinePct: pct(linesWithCatalogWorkId, lines.length),
    lineCount: lines.length,
    linesWithCatalogWorkId,
  };
}
