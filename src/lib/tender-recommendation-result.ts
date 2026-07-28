/**
 * TRE-01 Slice A — Recommendation Result (view-model Outcome).
 * Jedyna cena: Bid Proposal `recommendedBidPln` → `recommendedOfferPln` (bez kalkulacji).
 * Kontrakt DF §4.1.
 */

import type { OfferRunSnapshot } from "@/lib/tender-offer-run";
import type { TenderTrustAssessment, TenderTrustLevel } from "@/lib/tender-trust-layer";

export type RecommendationQualityStatus =
  | "ready"
  | "review_required"
  | "insufficient_data"
  | "running"
  | "failed";

export interface TenderRecommendationResult {
  runId: string;
  tenderPipelineItemId: string;
  bzpRef: string;
  tenderTitle: string;
  /** Zawsze z Bid Proposal — nigdy lokalna kalkulacja TRE-01. */
  recommendedOfferPln: number | null;
  qualityStatus: RecommendationQualityStatus;
  statusLabelPl: string;
  runPhaseLabelPl: string;
  canShowCostEstimate: boolean;
  trustOverall: TenderTrustLevel;
  trustLabelPl: string;
  hasBidRecommendation: boolean;
}

function mapLifecycleToQuality(
  snapshot: OfferRunSnapshot,
): RecommendationQualityStatus {
  if (snapshot.lifecycleStatus === "failed") return "failed";
  if (snapshot.lifecycleStatus === "running") return "running";
  if (snapshot.lifecycleStatus === "insufficient_data") return "insufficient_data";
  if (snapshot.lifecycleStatus === "review_required") return "review_required";
  return "ready";
}

function buildStatusLabelPl(snapshot: OfferRunSnapshot, trust: TenderTrustAssessment): string {
  if (snapshot.criticalErrorMessage) {
    return snapshot.criticalErrorMessage;
  }
  switch (snapshot.lifecycleStatus) {
    case "running":
      return snapshot.phaseLabelPl;
    case "insufficient_data":
      return "Brak wystarczających danych do rekomendowanej ceny oferty.";
    case "review_required":
      return `Rekomendacja dostępna — ${trust.overallLabelPl}. Warto przejrzeć kosztorys przed decyzją.`;
    case "ready":
      return "Rekomendowana cena oferty wyliczona z kosztorysu (Bid Proposal).";
    case "failed":
      return snapshot.criticalErrorMessage || "Wyliczenie zakończyło się błędem.";
    default:
      return snapshot.phaseLabelPl;
  }
}

/**
 * Buduje wynik rekomendacji wyłącznie z Offer Run + Trust + Bid (via snapshot).
 */
export function buildTenderRecommendationResult(input: {
  runId: string;
  snapshot: OfferRunSnapshot;
  trustAssessment: TenderTrustAssessment;
}): TenderRecommendationResult {
  const { runId, snapshot, trustAssessment } = input;
  const qualityStatus = mapLifecycleToQuality(snapshot);
  return {
    runId,
    tenderPipelineItemId: snapshot.tenderPipelineItemId,
    bzpRef: snapshot.bzpRef,
    tenderTitle: snapshot.tenderTitle,
    recommendedOfferPln: snapshot.recommendedBidPln,
    qualityStatus,
    statusLabelPl: buildStatusLabelPl(snapshot, trustAssessment),
    runPhaseLabelPl: snapshot.phaseLabelPl,
    canShowCostEstimate:
      snapshot.documentsReadyHint ||
      snapshot.hasBidRecommendation ||
      qualityStatus === "ready" ||
      qualityStatus === "review_required",
    trustOverall: trustAssessment.overall,
    trustLabelPl: trustAssessment.overallLabelPl,
    hasBidRecommendation: snapshot.hasBidRecommendation,
  };
}

export function formatRecommendedOfferPln(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${Math.round(value)} PLN`;
  }
}
