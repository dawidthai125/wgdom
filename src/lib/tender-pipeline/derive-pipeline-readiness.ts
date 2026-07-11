/**
 * NG11-A1 — sygnały readiness pipeline (pure, testowalne).
 */

import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { resolvedCostStatus } from "@/lib/tender-data-ssot";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";

/** NG11-Q5 — gate early pricing (partial persist flushed, nie sam kosztorys.ok w pamięci). */
export function canComputeTenderPricingAuto(opts: {
  enabled?: boolean;
  partialDossierReady: boolean;
  item: TenderPipelineItem;
}): boolean {
  if (opts.enabled === false) return false;
  const heavyDone = tenderDossierHeavyParseDone(opts.item.tenderDossier);
  if (!opts.partialDossierReady && !heavyDone) return false;
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
}): boolean {
  return opts.partialDossierReady && opts.ownerFinanceProposal?.ok === true;
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
