/**
 * NG-02 P0-D — auto pricing po heavy parse.
 * NG11-Q5 — early pricing po partialDossierReady + recompute po metadata merge.
 * COST-PIPELINE-01 — OfferBoq (L1) → Bid (L2) jako SSOT Outcome (flaga R0).
 */

import { useMemo } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { computeTenderBidProposal } from "@/lib/tenders-bid-calculator";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { resolveActiveCatalogForTender } from "@/lib/tender-active-catalog";
import { canComputeTenderPricingAuto } from "@/lib/tender-pipeline/derive-pipeline-readiness";
import {
  getTenderPriceOverrides,
  loadTenderPriceOverridesStoreLocal,
  type TenderPriceOverrideEntry,
} from "@/lib/tender-price-overrides";
import { computeRuntimeBidFromOfferBoq } from "@/lib/tender-offer-boq-explainability";
import { isCostPipeline01Enabled } from "@/lib/tenders-v4-config";

export function useTenderPricingAuto(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  /** NG11-Q5 — partial persist flushed (A1); uruchamia pierwszą wycenę. */
  partialDossierReady?: boolean;
  priceOverridesRevision?: number;
  /** #5C-0A — invalidation token po zapisie Biblioteki Robót */
  pricingCatalogRevision?: number;
  enabled?: boolean;
}): {
  ownerFinanceProposal: TenderBidProposal | null;
  bidProposal: TenderBidProposal | null;
  /** NG-03 P0 — ten sam odczyt co kalkulacja wyceny (UI Ceny). */
  priceOverrides: TenderPriceOverrideEntry[];
} {
  const {
    item,
    swz,
    partialDossierReady = false,
    priceOverridesRevision = 0,
    pricingCatalogRevision = 0,
    enabled = true,
  } = opts;

  const { priceOverrides, proposal } = useMemo(() => {
    void priceOverridesRevision;
    void pricingCatalogRevision;
    const store = loadTenderPriceOverridesStoreLocal();
    const overrides = getTenderPriceOverrides(store, item.id).overrides;

    if (!canComputeTenderPricingAuto({ enabled, partialDossierReady, item })) {
      return { priceOverrides: overrides, proposal: null };
    }

    // COST-PIPELINE-01: OfferBoq → Bid (S6). R0 OFF → legacy catalog poniżej.
    if (isCostPipeline01Enabled()) {
      const runtime = computeRuntimeBidFromOfferBoq({ item, swz: swz ?? null });
      if (runtime) {
        return { priceOverrides: overrides, proposal: runtime.proposal };
      }
      // DF §2.2: OfferBoq niedostępny → preferuj status (null), nie milczący catalog.
      return { priceOverrides: overrides, proposal: null };
    }

    const profile = loadCompanyProfileLocal();
    const { catalog } = resolveActiveCatalogForTender({
      referenceHourlyPln: profile.costModel.avgGrossHourlyPln,
    });
    const nextProposal = computeTenderBidProposal({
      kosztorys: item.tenderDossier?.kosztorys,
      swz: swz ?? item.swzAnalysis ?? null,
      fit: item.tenderFit,
      costModel: profile.costModel,
      minProjectDays: profile.minProjectDays,
      maxConcurrentProjects: profile.maxConcurrentProjects,
      catalog,
      priceOverrides: overrides,
    });
    return { priceOverrides: overrides, proposal: nextProposal };
  }, [
    enabled,
    partialDossierReady,
    item,
    item.id,
    item.tenderDossier,
    item.tenderDossier?.kosztorys,
    item.tenderDossier?.kosztorys?.rowCount,
    item.tenderDossier?.parserVersion,
    item.tenderDossier?.scanSummary?.parsedAt,
    item.tenderFit,
    swz,
    item.swzAnalysis,
    item.swzAnalysis?.awardCriteria,
    item.swzAnalysis?.wadiumPln,
    item.swzAnalysis?.wadiumPercent,
    item.swzAnalysis?.estimatedValuePln,
    item.swzAnalysis?.parsedAt,
    priceOverridesRevision,
    pricingCatalogRevision,
  ]);

  return {
    ownerFinanceProposal: proposal,
    bidProposal: proposal,
    priceOverrides,
  };
}
