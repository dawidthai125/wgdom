/**
 * P5-OWNER-VIEW-SPRINT-1 — logika Owner View na Przeglądzie (tylko prezentacja).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { daysUntilTenderDeadline, isTenderOpenForOffers } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import { FIT_LABELS } from "@/lib/tenders-bzp-fit";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { computeReferenceMatchSummary } from "@/lib/tenders-actions";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import {
  classifyCostDocument,
  resolvedCostStatus,
  resolvedTenderValuePln,
} from "@/lib/tender-data-ssot";
import { isKosztorysAwaitingHeavyParse, countTenderAttachments, type TenderAnalysisStatusRow } from "@/lib/tender-analysis-status-ux";
import { buildAthQuickAccessContext } from "@/lib/tender-ath-quick-access";
import {
  scoreTender,
  topDecisionReasons,
  type TenderDecision,
  type TenderScoringBundle,
} from "@/lib/tenders-strategy-decision";
import type { StrategicScoreContext } from "@/lib/tenders-strategy-strategic-score";
import { computeBidMarginPct, formatBidMarginPct } from "@/lib/tender-bid-ux";
import { TENDER_OWNER_VIEW_COPY } from "@/lib/tender-owner-language-pl";

export type OwnerDecisionBlockKind = "wadium" | "termin" | "kwalifikacja";

export interface OwnerDecisionBlockAlert {
  kind: OwnerDecisionBlockKind;
  message: string;
}

export interface OwnerDecisionView {
  label: string;
  decision: TenderDecision;
  reasons: string[];
  blocks: OwnerDecisionBlockAlert[];
}

export interface OwnerFinanceView {
  ready: boolean;
  revenuePln: number | null;
  costPln: number | null;
  marginPct: number | null;
  revenueDisplay: string;
  costDisplay: string;
  marginDisplay: string;
}

export type OwnerPositionsFileState =
  | "przedmiar"
  | "kosztorys"
  | "awaiting"
  | "missing";

export interface OwnerPositionsFileView {
  state: OwnerPositionsFileState;
  docType: string;
  rowCount: number;
  title: string;
  subtitle: string;
  ctaLabel: string | null;
}

export interface OwnerRiskTermRow {
  id: "termin" | "wadium" | "ryzyko";
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad" | "neutral";
}

function ownerFriendlyReasons(bundle: TenderScoringBundle): string[] {
  const fromScore = topDecisionReasons(bundle)
    .map((r) => r.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (fromScore.length >= 2) return fromScore.slice(0, 3);

  const item = bundle.item;
  const profile = loadCompanyProfileLocal();
  const swz = item.swzAnalysis;
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const ref = computeReferenceMatchSummary(item, profile);
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);

  const built: string[] = [];
  if (offerOpen) built.push("termin OK");
  if (!wadium.blocked && (wadium.amountPln != null || wadium.raw)) built.push("wadium OK");
  if (ref.status === "ok") built.push("referencje OK");
  else if (ref.status === "partial") built.push("referencje częściowo");

  if (built.length === 0) return fromScore.slice(0, 3);
  return [...new Set([...built, ...fromScore])].slice(0, 3);
}

export function buildOwnerDecisionView(
  bundle: TenderScoringBundle,
): OwnerDecisionView {
  const item = bundle.item;
  const profile = loadCompanyProfileLocal();
  const swz = item.swzAnalysis;
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const ref = computeReferenceMatchSummary(item, profile);
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);

  const blocks: OwnerDecisionBlockAlert[] = [];
  if (wadium.blocked) {
    blocks.push({ kind: "wadium", message: `Wadium blokuje udział — ${wadium.summary}` });
  }
  if (item.submittingOffersDate && !offerOpen) {
    blocks.push({ kind: "termin", message: "Termin składania ofert minął" });
  }
  if (ref.status === "gap") {
    blocks.push({ kind: "kwalifikacja", message: ref.summary });
  }

  return {
    label: bundle.decisionLabel,
    decision: bundle.decision,
    reasons: ownerFriendlyReasons(bundle),
    blocks,
  };
}

export function scoreTenderForOwnerView(
  item: TenderPipelineItem,
  strategicContext: StrategicScoreContext,
): TenderScoringBundle {
  const profile = strategicContext.profile ?? loadCompanyProfileLocal();
  return scoreTender(item, profile, strategicContext);
}

export function buildOwnerFinanceView(
  bidProposal: TenderBidProposal | null | undefined,
): OwnerFinanceView {
  const revenuePln = bidProposal?.recommendedBidPln ?? null;
  const costPln = bidProposal?.costPricePln ?? null;
  const marginPct = computeBidMarginPct(revenuePln, costPln);
  const ready = bidProposal?.ok === true
    && revenuePln != null
    && costPln != null;

  return {
    ready,
    revenuePln,
    costPln,
    marginPct,
    revenueDisplay: revenuePln != null ? fmtPln(revenuePln) : "—",
    costDisplay: costPln != null ? fmtPln(costPln) : "—",
    marginDisplay: formatBidMarginPct(marginPct),
  };
}

export function buildOwnerPositionsFileView(item: TenderPipelineItem): OwnerPositionsFileView {
  const costStatus = resolvedCostStatus(item);
  const classified = classifyCostDocument(item);
  const docType = classified?.type ?? "ATH";
  const rowCount = classified?.rowCount ?? item.tenderDossier?.kosztorys?.rowCount ?? 0;
  const athCtx = buildAthQuickAccessContext(item);

  if (isKosztorysAwaitingHeavyParse(item)) {
    return {
      state: "awaiting",
      docType,
      rowCount,
      title: "Oczekuje na przetworzenie",
      subtitle: "Załączniki są dostępne.",
      ctaLabel: "Otwórz Dokumenty",
    };
  }

  if (costStatus === "FOUND_NO_VALUE") {
    const rowSuffix = rowCount > 0 ? `${rowCount} pozycji` : "pozycje";
    return {
      state: "przedmiar",
      docType,
      rowCount,
      title: "Przedmiar znaleziony",
      subtitle: `${docType} · ${rowSuffix}`,
      ctaLabel: athCtx.previewItem ? "Otwórz przedmiar" : null,
    };
  }

  if (costStatus === "FOUND_WITH_VALUE") {
    return {
      state: "kosztorys",
      docType,
      rowCount,
      title: "Kosztorys znaleziony",
      subtitle: `${docType} · wyceniony`,
      ctaLabel: athCtx.previewItem ? "Otwórz kosztorys" : null,
    };
  }

  const hasAttachments = countTenderAttachments(item) > 0;
  if (hasAttachments) {
    return {
      state: "awaiting",
      docType,
      rowCount,
      title: "Oczekuje na przetworzenie",
      subtitle: "Załączniki są dostępne.",
      ctaLabel: "Otwórz Dokumenty",
    };
  }

  return {
    state: "missing",
    docType,
    rowCount,
    title: "Brak pliku",
    subtitle: "Nie znaleziono pliku z pozycjami.",
    ctaLabel: null,
  };
}

export function buildOwnerRiskTermRows(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  fit: TenderFitAssessment | null | undefined,
): OwnerRiskTermRow[] {
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);
  const days = daysUntilTenderDeadline(item.submittingOffersDate);
  const valuePln = resolvedTenderValuePln(item, swz);

  const deadlineValue = item.submittingOffersDate
    ? offerOpen && days != null && days >= 0
      ? `${days} dni do terminu`
      : offerOpen
        ? "Termin otwarty"
        : "Termin minął"
    : "Brak daty";

  const rows: OwnerRiskTermRow[] = [
    {
      id: "termin",
      label: "Termin",
      value: deadlineValue,
      tone: !item.submittingOffersDate
        ? "neutral"
        : offerOpen
          ? days != null && days <= 3
            ? "warn"
            : "ok"
          : "bad",
    },
  ];

  // P5-004 — wadium pokazywane w Owner Hero; bez duplikatu tutaj.

  if (fit) {
    rows.push({
      id: "ryzyko",
      label: TENDER_OWNER_VIEW_COPY.riskFitLabel,
      value: `${FIT_LABELS[fit.fitLabel]} · ${fit.fitScore}/100`,
      tone: fit.fitScore >= 65 ? "ok" : fit.fitScore >= 45 ? "warn" : "bad",
    });
  } else if (valuePln != null) {
    rows.push({
      id: "ryzyko",
      label: TENDER_OWNER_VIEW_COPY.riskValueLabel,
      value: fmtPln(valuePln),
      tone: "neutral",
    });
  }

  return rows;
}

/** P5-004 — w sekcji Więcej ukryj kroki już widoczne na Owner View. */
export function filterOwnerMoreAnalysisRows(
  rows: TenderAnalysisStatusRow[],
): TenderAnalysisStatusRow[] {
  return rows.filter((r) => r.id === "notice" || r.id === "documents");
}

export function ownerDecisionTone(decision: TenderDecision): string {
  switch (decision) {
    case "GO":
      return "border-emerald-500/45 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "HOLD":
      return "border-amber-500/45 bg-amber-500/10 text-amber-900 dark:text-amber-200";
    case "NO-GO":
      return "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-300";
  }
}

export function ownerRiskToneClass(tone: OwnerRiskTermRow["tone"]): string {
  switch (tone) {
    case "ok":
      return "text-emerald-700 dark:text-emerald-400";
    case "warn":
      return "text-amber-700 dark:text-amber-400";
    case "bad":
      return "text-red-700 dark:text-red-400";
    default:
      return "text-foreground";
  }
}
