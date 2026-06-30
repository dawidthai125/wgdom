/**
 * NG-02 P0-D — auto pricing po zakończeniu heavy parse.
 */

import { useMemo } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { computeTenderBidProposal } from "@/lib/tenders-bid-calculator";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { resolveActiveCatalogForTender } from "@/lib/tender-active-catalog";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { resolvedCostStatus } from "@/lib/tender-data-ssot";
import {
  getTenderPriceOverrides,
  loadTenderPriceOverridesStoreLocal,
  type TenderPriceOverrideEntry,
} from "@/lib/tender-price-overrides";

export function useTenderPricingAuto(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  priceOverridesRevision?: number;
  enabled?: boolean;
}): {
  ownerFinanceProposal: TenderBidProposal | null;
  bidProposal: TenderBidProposal | null;
  /** NG-03 P0 — ten sam odczyt co kalkulacja wyceny (UI Ceny). */
  priceOverrides: TenderPriceOverrideEntry[];
} {
  const { item, swz, priceOverridesRevision = 0, enabled = true } = opts;

  const { priceOverrides, proposal } = useMemo(() => {
    void priceOverridesRevision;
    const store = loadTenderPriceOverridesStoreLocal();
    const overrides = getTenderPriceOverrides(store, item.id).overrides;

    if (!enabled) {
      return { priceOverrides: overrides, proposal: null };
    }
    if (!tenderDossierHeavyParseDone(item.tenderDossier)) {
      return { priceOverrides: overrides, proposal: null };
    }
    if (resolvedCostStatus(item) === "NOT_FOUND") {
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
    item,
    item.id,
    item.tenderDossier,
    item.tenderDossier?.kosztorys,
    item.tenderDossier?.parserVersion,
    item.tenderDossier?.scanSummary?.parsedAt,
    item.tenderFit,
    swz,
    item.swzAnalysis,
    priceOverridesRevision,
  ]);

  return {
    ownerFinanceProposal: proposal,
    bidProposal: proposal,
    priceOverrides,
  };
}
