/**
 * NG-02 P0-D — auto pricing po heavy parse.
 * NG11-Q5 — early pricing po partialDossierReady + recompute po metadata merge.
 * COST-PIPELINE-01 — OfferBoq (L1) → Bid (L2) jako SSOT Outcome (flaga R0).
 * C-MODE-1a — OfferBoq null → GAP (ZERO ath_priced / catalog / companyPrice fallback).
 * COST-MULTI-02 — Bid/OfferBoq input via resolveKosztorysSnapshotForPricing.
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
import { resolveKosztorysSnapshotForPricing } from "@/lib/cost-multi-02";

/**
 * Legacy catalog Bid — KEEP TECHNICALLY (costPipeline OFF / regresje / P7).
 * C-MODE-1a: NIE wołać z resolveTenderPricingAutoProposal gdy pipeline ON.
 */
export function computeCatalogBidProposalForPricingAuto(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  priceOverrides: TenderPriceOverrideEntry[];
}): TenderBidProposal {
  const profile = loadCompanyProfileLocal();
  const { catalog } = resolveActiveCatalogForTender({
    referenceHourlyPln: profile.costModel.avgGrossHourlyPln,
  });
  // COST-MULTI-02 — Bid czyta kosztorysForBid (Aggregate|ONE|HOLD fallback), nie mutuje dossier.
  const kosztorys = resolveKosztorysSnapshotForPricing(opts.item);
  return computeTenderBidProposal({
    kosztorys,
    swz: opts.swz ?? opts.item.swzAnalysis ?? null,
    fit: opts.item.tenderFit,
    costModel: profile.costModel,
    minProjectDays: profile.minProjectDays,
    maxConcurrentProjects: profile.maxConcurrentProjects,
    catalog,
    priceOverrides: opts.priceOverrides,
  });
}

/**
 * C-MODE-1a — wybór Bid (nowy tor):
 * 1) OfferBoq → F5 Position Cost → Bid (w tym ok:false / GAP)
 * 2) OfferBoq unavailable → null (jawny GAP)
 *
 * ZERO: ath_priced / catalog / companyPricePln jako fallback nowego Bid.
 * costPipeline OFF → legacy catalog (osobna flaga, nie C-MODE cutover path).
 *
 * Pure — testowalne bez React.
 */
export function resolveTenderPricingAutoProposal(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  priceOverrides: TenderPriceOverrideEntry[];
  /** Test override; domyślnie flaga tip. */
  costPipeline01Enabled?: boolean;
  /** F5 — default true w runtime. Testy legacy: false. */
  positionCostCutover?: boolean;
}): TenderBidProposal | null {
  const costPipelineOn =
    opts.costPipeline01Enabled ?? isCostPipeline01Enabled();

  if (costPipelineOn) {
    const runtime = computeRuntimeBidFromOfferBoq({
      item: opts.item,
      swz: opts.swz ?? null,
      positionCostCutover: opts.positionCostCutover,
    });
    if (runtime) {
      return runtime.proposal;
    }
    // C-MODE-1a: OfferBoq null → GAP · NIE ath_priced / catalog / companyPricePln.
    return null;
  }

  return computeCatalogBidProposalForPricingAuto({
    item: opts.item,
    swz: opts.swz,
    priceOverrides: opts.priceOverrides,
  });
}

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

    const next = resolveTenderPricingAutoProposal({
      item,
      swz: swz ?? null,
      priceOverrides: overrides,
    });
    return { priceOverrides: overrides, proposal: next };
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
    item.tenderDossier?.scanSummary?.branchWinnerArtifacts,
    item.tenderDossier?.scanSummary?.costCandidateSources,
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
