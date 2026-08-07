/**
 * WIRE-CHIEF-RO-ADAPTERS-01 — typy bundle RO App → Chief input.
 * Bez logiki domenowej · bez wywołań Chief/ekspertów.
 */

import type { CompanyCostRo } from "@/lib/cost-expert";
import type { OfferStrategyParamsRo } from "@/lib/offer-expert";
import type { AnalyzeMarketPricingOptions } from "@/lib/pricing-expert";
import type { OfferBoqDocument } from "@/lib/tender-offer-boq";

/** Luka projekcji — nie Finding, nie blocker eksperta. */
export interface ChiefWireAdapterGap {
  code: string;
  field: string;
  messagePl: string;
  severity: "info" | "warn";
}

export interface ChiefWireAdapterMeta {
  builtAtIso: string;
  tenderPipelineItemId: string | null;
  sources: {
    offerBoq: "buildOfferBoqDocumentForPipelineItem" | "unavailable";
    catalog: "kw-wgdom-work-catalog" | "unavailable";
    companyProfile: "kw-tenders-company-profile";
    companyKnowledge: "kw-offer-boq-company-knowledge" | "skipped";
    offerStrategy: "offer-expert.defaultOfferStrategyParams";
  };
  gaps: readonly ChiefWireAdapterGap[];
}

/**
 * Bundle RO dla Session EPIC.
 * NIE jest wynikiem Chief — tylko wejście.
 */
export interface ChiefWireRuntimeRo {
  offerBoq: OfferBoqDocument | null;
  pricing: AnalyzeMarketPricingOptions | null;
  company: CompanyCostRo;
  offerStrategy: OfferStrategyParamsRo;
  meta: ChiefWireAdapterMeta;
  readyForChiefInput: boolean;
}

export interface BuildChiefOfferBoqRoResult {
  offerBoq: OfferBoqDocument | null;
  gaps: ChiefWireAdapterGap[];
}

export interface BuildChiefPricingOptionsRoResult {
  pricing: AnalyzeMarketPricingOptions | null;
  gaps: ChiefWireAdapterGap[];
  source: ChiefWireAdapterMeta["sources"]["catalog"];
}

export interface BuildChiefCompanyCostRoResult {
  company: CompanyCostRo;
  gaps: ChiefWireAdapterGap[];
  companyKnowledge: ChiefWireAdapterMeta["sources"]["companyKnowledge"];
}

export interface BuildChiefOfferStrategyParamsRoResult {
  offerStrategy: OfferStrategyParamsRo;
  gaps: ChiefWireAdapterGap[];
}
