/**
 * V3.1 Sprint 1 — jedna rekomendowana akcja (reguły P0–P12).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { isTenderOpenForOffers } from "@/lib/tenders-bzp";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { computeReferenceMatchSummary } from "@/lib/tenders-actions";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import {
  isKosztorysAwaitingHeavyParse,
  countTenderAttachments,
} from "@/lib/tender-analysis-status-ux";
import { resolvedCostStatus } from "@/lib/tender-data-ssot";
import { computeBidMarginPct } from "@/lib/tender-bid-ux";
import type { BidPrepCheckItem } from "@/lib/tenders-bid-prep";
import type { ParticipationCheckResult } from "@/lib/tender-participation-check";
import type { TenderDecision } from "@/lib/tenders-strategy-decision";
import type { OwnerTenderDecisionRecord } from "@/lib/tenders-strategy-owner-decisions";
import type { TenderMonitoringCounts } from "@/lib/tender-workspace-ux";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";
import type { TenderIntelligenceOverlay } from "@/lib/tender-intelligence-overlay";
import { hasReadyTenderMargin, overlayRecommendsStart } from "@/lib/tender-intelligence-overlay";

export type IntelligenceNextActionRuleId =
  | "P0" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7"
  | "P8" | "P9" | "P10" | "P11" | "P12";

export interface IntelligenceNextAction {
  ruleId: IntelligenceNextActionRuleId;
  title: string;
  description: string;
  buttonLabel: string;
  tab: TenderWorkspaceTabId | null;
  ownerDecision: TenderDecision | null;
  expandDetails: boolean;
  informationalOnly: boolean;
}

function action(
  ruleId: IntelligenceNextActionRuleId,
  title: string,
  description: string,
  buttonLabel: string,
  opts?: {
    tab?: TenderWorkspaceTabId | null;
    ownerDecision?: TenderDecision | null;
    expandDetails?: boolean;
    informationalOnly?: boolean;
  },
): IntelligenceNextAction {
  return {
    ruleId,
    title,
    description,
    buttonLabel,
    tab: opts?.tab ?? null,
    ownerDecision: opts?.ownerDecision ?? null,
    expandDetails: opts?.expandDetails ?? false,
    informationalOnly: opts?.informationalOnly ?? false,
  };
}

function hasParticipationCriticalFail(
  participationResult: ParticipationCheckResult | null | undefined,
): boolean {
  if (!participationResult) return false;
  return participationResult.overall === "gaps" && participationResult.missing.length > 0;
}

function kosztorysReady(item: TenderPipelineItem): boolean {
  const costStatus = resolvedCostStatus(item);
  return costStatus !== "NOT_FOUND" && Boolean(item.tenderDossier?.kosztorys?.ok);
}

function resolveAnalyzeTarget(
  item: TenderPipelineItem,
  participationResult: ParticipationCheckResult | null | undefined,
): TenderWorkspaceTabId {
  const costStatus = resolvedCostStatus(item);
  if (costStatus === "NOT_FOUND") return "documents";
  if (computeReferenceMatchSummary(item, loadCompanyProfileLocal()).status === "gap") {
    return "qualification";
  }
  if (hasParticipationCriticalFail(participationResult)) return "qualification";
  return "valuation";
}

export interface ResolveOwnerNextActionInput {
  item: TenderPipelineItem;
  overlay: TenderIntelligenceOverlay;
  ownerFinanceProposal: TenderBidProposal | null | undefined;
  ownerDecision?: OwnerTenderDecisionRecord | null;
  monitoringCounts?: TenderMonitoringCounts;
  bidPrepChecks?: BidPrepCheckItem[];
  participationResult?: ParticipationCheckResult | null;
}

/** Pierwsza pasująca reguła wygrywa — dokładnie jedna akcja. */
export function resolveOwnerNextAction(
  input: ResolveOwnerNextActionInput,
): IntelligenceNextAction {
  const {
    item,
    overlay,
    ownerFinanceProposal,
    ownerDecision = null,
    monitoringCounts,
    participationResult,
  } = input;

  const profile = loadCompanyProfileLocal();
  const swz = item.swzAnalysis;
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const ref = computeReferenceMatchSummary(item, profile);
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);
  const costStatus = resolvedCostStatus(item);
  const attachments = countTenderAttachments(item);
  const awaitingParse = isKosztorysAwaitingHeavyParse(item);
  const ownerRecord = ownerDecision;

  if (!offerOpen) {
    return action(
      "P0",
      "Odpuść — termin minął",
      "Termin składania ofert już minął.",
      "Zamknij temat",
      { ownerDecision: "NO-GO" },
    );
  }

  if (wadium.blocked) {
    return action(
      "P1",
      "Odpuść — wadium",
      wadium.summary || "Wadium przekracza możliwości firmy.",
      "Odpuść przetarg",
      { ownerDecision: "NO-GO" },
    );
  }

  if (ref.status === "gap") {
    return action(
      "P2",
      "Uzupełnij referencje",
      ref.summary || "Brakuje referencji wymaganych w SWZ.",
      "Przejdź do kwalifikacji",
      { tab: "qualification" },
    );
  }

  if (hasParticipationCriticalFail(participationResult)) {
    return action(
      "P3",
      "Sprawdź formalia",
      participationResult?.summaryLabel ?? "Warunek udziału nie jest spełniony.",
      "Kwalifikacja",
      { tab: "qualification" },
    );
  }

  if (costStatus === "NOT_FOUND" && attachments > 0 && awaitingParse) {
    return action(
      "P4",
      "Poczekaj na dokumenty",
      "Kosztorys i załączniki są w trakcie wczytywania.",
      "Oczekuj",
      { informationalOnly: true },
    );
  }

  if (costStatus === "NOT_FOUND" && !awaitingParse) {
    return action(
      "P5",
      "Znajdź kosztorys",
      "Brak pliku z pozycjami do wyceny.",
      "Przejdź do dokumentów",
      { tab: "documents" },
    );
  }

  if (kosztorysReady(item) && !ownerFinanceProposal?.ok && item.ourEstimatePln == null) {
    return action(
      "P6",
      "Poleć do wyceny",
      "Trzeba policzyć marżę na podstawie kosztorysu.",
      "Przejdź do wyceny",
      { tab: "valuation" },
    );
  }

  if (ownerFinanceProposal?.ok) {
    const margin = computeBidMarginPct(
      ownerFinanceProposal.recommendedBidPln,
      ownerFinanceProposal.costPricePln,
    );
    const minMargin = profile.costModel.minMarginPct;
    if (margin != null && margin < minMargin) {
      return action(
        "P7",
        "Popraw wycenę",
        `Marża ${margin.toFixed(1)}% jest poniżej progu firmy (${minMargin}%).`,
        "Wycena",
        { tab: "valuation" },
      );
    }
  }

  if (overlayRecommendsStart(overlay) && !ownerRecord) {
    return action(
      "P8",
      "Zatwierdź STARTUJ",
      "Ekonomia i formalia wyglądają na gotowe do decyzji.",
      "Zatwierdź STARTUJ",
      { ownerDecision: "GO" },
    );
  }

  if (overlay.displayDecision === "HOLD" && !ownerRecord) {
    const target = resolveAnalyzeTarget(item, participationResult);
    const label = target === "documents"
      ? "Przejdź do dokumentów"
      : target === "qualification"
        ? "Przejdź do kwalifikacji"
        : "Przejdź do wyceny";
    return action(
      "P9",
      "Deleguj analizę",
      "System nie jest gotowy na ostateczną decyzję właściciela.",
      label,
      { tab: target },
    );
  }

  if (overlayRecommendsStart(overlay) && ownerRecord?.decision === "GO") {
    return action(
      "P10",
      "Przygotuj ofertę",
      "Decyzja STARTUJ została zapisana — kompletuj dokumenty ofertowe.",
      "Przejdź do oferty",
      { tab: "offer" },
    );
  }

  const monitoringTotal = monitoringCounts?.total ?? 0;
  if (monitoringTotal > 0) {
    return action(
      "P11",
      "Sprawdź zmiany",
      `Wykryto ${monitoringTotal} nowych sygnałów w dokumentacji.`,
      "Dokumenty",
      { tab: "documents" },
    );
  }

  return action(
    "P12",
    "Przejrzyj szczegóły",
    "Otwórz pełny widok dowodów i statusu przygotowania.",
    "Zobacz dowody",
    { expandDetails: true },
  );
}
