/**
 * Ekspert Cen — czynność domenowa (P0).
 * Wejście: MaterialExpertAnalysisResult. Warstwa: Market Price only.
 */

import type { MaterialExpertAnalysisResult } from "@/lib/material-expert";
import type { PriceHistoryEntry } from "@/lib/market-sync/types";
import type {
  MarketResolutionContext,
  MarketSourceEngineConfig,
} from "@/lib/work-catalog/market-average-engine";
import type { CatalogWork } from "@/lib/work-catalog/types";
import { analyzeMaterialMarketLine } from "./analyze-line";
import { buildPricingExpertContract } from "./interpret";
import {
  buildMaterialMarketMapIndex,
  mapMaterialToMarketWork,
} from "./material-market-map";
import type { MaterialMarketMapEntry, PricingExpertAnalysisResult } from "./types";

export interface PricingExpertCatalogRo {
  /** workId → CatalogWork z marketQuotes (RO). */
  worksById: ReadonlyMap<string, CatalogWork>;
}

export interface AnalyzeMarketPricingOptions {
  catalog: PricingExpertCatalogRo;
  priceHistory?: readonly PriceHistoryEntry[];
  materialMap?: readonly MaterialMarketMapEntry[];
  nowMs?: number;
  computedAtIso?: string;
  resolutionContext?: MarketResolutionContext;
  engineConfig?: MarketSourceEngineConfig;
}

export function analyzeMarketPricingFromMaterials(
  materials: MaterialExpertAnalysisResult,
  opts: AnalyzeMarketPricingOptions,
): PricingExpertAnalysisResult {
  const nowMs = opts.nowMs ?? Date.now();
  const computedAtIso = opts.computedAtIso ?? new Date(nowMs).toISOString();
  const mapIndex = buildMaterialMarketMapIndex(opts.materialMap);

  const meHintsByKey = new Map<string, string[]>();
  for (const g of materials.gapsAndRisks ?? []) {
    if (g.kind === "availability_risk" && g.materialKey) {
      const list = meHintsByKey.get(g.materialKey) ?? [];
      list.push(g.messagePl);
      meHintsByKey.set(g.materialKey, list);
    }
  }
  for (const v of materials.variants ?? []) {
    const limited = v.options.find((o) => o.kind === "ograniczona_dostepnosc");
    if (!limited) continue;
    const list = meHintsByKey.get(v.baseMaterialKey) ?? [];
    list.push(
      `ME proponuje wariant przy ograniczonej dostępności: ${limited.namePl} — weryfikacja przed domknięciem Market.`,
    );
    meHintsByKey.set(v.baseMaterialKey, list);
  }

  const lines = (materials.lines ?? []).map((line) => {
    const map = mapMaterialToMarketWork(line.materialKey, mapIndex);
    const work = map ? opts.catalog.worksById.get(map.workId) ?? null : null;
    return analyzeMaterialMarketLine({
      materialKey: line.materialKey,
      namePl: line.namePl,
      quantity: line.quantity,
      unit: line.unit,
      map,
      work,
      priceHistory: opts.priceHistory,
      nowMs,
      computedAtIso,
      resolutionContext: opts.resolutionContext,
      engineConfig: opts.engineConfig,
      materialReturnHints: meHintsByKey.get(line.materialKey) ?? [],
    });
  });

  const materialAligned =
    materials.contract.zgodnoscZRozumieniemWykonania === "aligned" ||
    materials.contract.zgodnoscZRozumieniemWykonania === "partial";

  const contract = buildPricingExpertContract({
    lines,
    materialCompleteness: materials.completeness,
    materialAligned,
  });

  const returnReasonsPl: string[] = [];
  const reanalysisMaterialKeys: string[] = [];
  let requiresReanalysis = false;
  let returnToMaterialExpert = false;

  for (const l of lines) {
    if (l.requiresReanalysis) {
      requiresReanalysis = true;
      reanalysisMaterialKeys.push(l.materialKey);
    }
    if (l.returnToMaterialExpert) {
      returnToMaterialExpert = true;
      if (l.returnReasonPl) returnReasonsPl.push(l.returnReasonPl);
    }
  }

  if (materials.completeness === "niekompletny") {
    returnToMaterialExpert = true;
    requiresReanalysis = true;
    returnReasonsPl.push("System materiałowy niekompletny — powrót do Eksperta Materiałów.");
  }

  return {
    contract,
    lines,
    requiresReanalysis,
    returnToMaterialExpert,
    returnReasonsPl: [...new Set(returnReasonsPl)],
    reanalysisMaterialKeys: [...new Set(reanalysisMaterialKeys)],
  };
}
