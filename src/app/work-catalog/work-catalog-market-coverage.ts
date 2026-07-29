/**
 * WORK-CATALOG-P3.3 · S5 — Market coverage (pure, RO).
 * Agregacja wyłącznie z Engine API — bez nowej formuły średniej (IC-5).
 */

import type { CatalogWork } from "@/lib/work-catalog";
import {
  buildEngineMarketComparisonForWork,
  resolveMarketStartRegion,
  type EngineMarketPriceOrigin,
} from "@/app/work-catalog/work-catalog-market-engine";

export type MarketCoverageBucket = EngineMarketPriceOrigin;

export interface MarketCoverageSummary {
  total: number;
  engine: number;
  legacySeed: number;
  legacyAvg: number;
  none: number;
  enginePct: number;
  startRegionCode: string;
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Pokrycie rynku dla listy robót aktywnego regionu.
 * `activeRegion` mapowany jak S1 (D-B): resolveMarketStartRegion.
 */
export function computeMarketCoverageSummary(
  works: readonly CatalogWork[],
  activeRegion: string | null | undefined,
  computedAtIso?: string,
): MarketCoverageSummary {
  const startRegionCode = resolveMarketStartRegion(activeRegion);
  let engine = 0;
  let legacySeed = 0;
  let legacyAvg = 0;
  let none = 0;

  for (const work of works) {
    const result = buildEngineMarketComparisonForWork(work, {
      startRegionCode,
      computedAtIso,
    });
    switch (result.priceOrigin as MarketCoverageBucket) {
      case "engine":
        engine += 1;
        break;
      case "legacy_seed":
        legacySeed += 1;
        break;
      case "legacy_avg":
        legacyAvg += 1;
        break;
      default:
        none += 1;
        break;
    }
  }

  const total = works.length;
  return {
    total,
    engine,
    legacySeed,
    legacyAvg,
    none,
    enginePct: pct(engine, total),
    startRegionCode,
  };
}
