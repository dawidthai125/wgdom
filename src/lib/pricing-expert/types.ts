/**
 * Ekspert Cen — typy (P0). Wyłącznie warstwa Market Price.
 */

import type { MarketCoverage, MarketOriginId } from "@/lib/work-catalog/market-sources";
import type { MarketRegionCode } from "@/lib/work-catalog/market-regions";

export type PricingExpertConfidence = "high" | "medium" | "low";

export type PricingPcrAlignment = "aligned" | "partial" | "not_aligned";

export type MarketTrendKind = "up" | "down" | "flat" | "unknown";

export type MarketPriceRiskLevel = "low" | "medium" | "high";

export type MarketFreshnessStatus = "ok" | "stale" | "missing";

export interface PricingExpertBlocker {
  code: string;
  messagePl: string;
  materialKey?: string;
}

/** Mapowanie materiał → pozycja katalogu z marketQuotes (cienka warstwa). */
export interface MaterialMarketMapEntry {
  materialKey: string;
  workId: string;
  /** Opcjonalnie klucz PriceHistory (REUSE staging). */
  marketProductId?: string;
  labelPl: string;
}

export interface PricingSourceView {
  origin: MarketOriginId;
  pricePln: number;
  regionCode: MarketRegionCode;
  coverage: MarketCoverage;
  confidence: number;
  updatedAt: string;
  fallbackUsed: boolean;
}

export interface PricingLineMarketAnalysis {
  materialKey: string;
  namePl: string;
  quantity: number;
  unit: string;
  mappedWorkId: string | null;
  mapLabelPl: string | null;
  /** Market Price (średnia ważona confidence) — nie companyPrice, nie Bid. */
  marketPricePln: number | null;
  originCount: number;
  sources: PricingSourceView[];
  dominantCoverage: MarketCoverage | null;
  freshness: MarketFreshnessStatus;
  freshestUpdatedAt: string | null;
  trend: MarketTrendKind;
  trendDeltaPct: number | null;
  /** Rozrzut (max-min)/avg * 100 gdy ≥2 źródła. */
  spreadPct: number | null;
  priceRisk: MarketPriceRiskLevel;
  riskNotesPl: string[];
  requiresReanalysis: boolean;
  returnToMaterialExpert: boolean;
  returnReasonPl: string | null;
}

export interface PricingExpertContract {
  co: string;
  dlaczego: string;
  naPodstawieCzego: string;
  pewnosc: PricingExpertConfidence;
  blokery: PricingExpertBlocker[];
  zgodnoscZRozumieniemWykonania: PricingPcrAlignment;
  zgodnoscOpisPl: string;
}

export interface PricingExpertAnalysisResult {
  contract: PricingExpertContract;
  lines: PricingLineMarketAnalysis[];
  requiresReanalysis: boolean;
  returnToMaterialExpert: boolean;
  returnReasonsPl: string[];
  reanalysisMaterialKeys: string[];
}
