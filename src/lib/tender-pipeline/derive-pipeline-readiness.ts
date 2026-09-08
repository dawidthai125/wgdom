/**
 * NG11-A1 — sygnały readiness pipeline (pure, testowalne).
 * C2 align — canonicalCostInputReady (kosztorysForBid) odblokowuje COST INPUT
 * bez zapisu do dossier.kosztorys; ownerFinanceProposal.ok pozostaje obowiązkowe.
 */

import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { resolvedCostStatus } from "@/lib/tender-data-ssot";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { resolveKosztorysSnapshotForPricing } from "@/lib/cost-multi-02";
import { hasUsableKosztorysBidLines } from "@/lib/cost-c2-ingest-bid-handoff";

/**
 * Usable canonical Bid/OfferBoq cost input (COST-MULTI-02 + C2 handoff).
 * Does NOT require dossier.kosztorys / ONE Discovery.
 */
export function isCanonicalCostInputReady(item: TenderPipelineItem): boolean {
  return hasUsableKosztorysBidLines(resolveKosztorysSnapshotForPricing(item));
}

/** NG11-Q5 — gate early pricing (partial persist flushed, nie sam kosztorys.ok w pamięci). */
export function canComputeTenderPricingAuto(opts: {
  enabled?: boolean;
  partialDossierReady: boolean;
  item: TenderPipelineItem;
}): boolean {
  if (opts.enabled === false) return false;
  const heavyDone = tenderDossierHeavyParseDone(opts.item.tenderDossier);
  const canonicalReady = isCanonicalCostInputReady(opts.item);
  // COST INPUT: legacy partial/heavy OR usable kosztorysForBid (C2/Aggregate/ONE-for-bid).
  if (!opts.partialDossierReady && !heavyDone && !canonicalReady) return false;
  if (canonicalReady) return true;
  return resolvedCostStatus(opts.item) !== "NOT_FOUND";
}

export function derivePartialDossierReady(opts: {
  item: TenderPipelineItem;
  partialPersistPending: boolean;
}): boolean {
  return Boolean(opts.item.tenderDossier?.kosztorys?.ok) && !opts.partialPersistPending;
}

export function deriveDossierEnriching(opts: {
  metadataPhaseRunning: boolean;
}): boolean {
  return opts.metadataPhaseRunning;
}

export function derivePricingReadyPartial(opts: {
  partialDossierReady: boolean;
  ownerFinanceProposal: TenderBidProposal | null;
  /** C2/OfferBoq path — usable kosztorysForBid without dossier.kosztorys. */
  canonicalCostInputReady?: boolean;
}): boolean {
  const costReady =
    opts.partialDossierReady || opts.canonicalCostInputReady === true;
  return costReady && opts.ownerFinanceProposal?.ok === true;
}

export function derivePricingReadyFinal(opts: {
  item: TenderPipelineItem;
  ownerFinanceProposal: TenderBidProposal | null;
  /** NG11-A1 — metadata phase w toku; blokuje final na partial-only dossier. */
  dossierEnriching?: boolean;
}): boolean {
  if (opts.ownerFinanceProposal?.ok !== true) return false;
  if (!tenderDossierHeavyParseDone(opts.item.tenderDossier)) return false;
  const hasMetadataStamp = Boolean(opts.item.tenderDossier?.scanSummary?.parsedAt);
  if (hasMetadataStamp) return true;
  // Legacy single-phase parse (bez A1 enrichment) — brak parsedAt, ale kosztorys.ok wystarcza.
  return !opts.dossierEnriching;
}
