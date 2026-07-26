import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import { estimatedValuePlnFromItem } from "@/lib/tenders-bzp-fit";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { isTenderOpenForOffers, daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { resolveTenderPlatformDocumentStatus } from "@/lib/tender-platform-awareness";
import { buildKosztorysMissingMessage } from "@/lib/tender-dossier-pipeline";
import {
  isKosztorysAwaitingHeavyParse,
  isPricingAwaitingLazyEvaluation,
  countTenderAttachments,
} from "@/lib/tender-analysis-status-ux";
import {
  resolveKosztorysAwaitingParseDisplay,
  type KosztorysProcessSession,
} from "@/lib/tender-kosztorys-process-phase";
import { TENDER_OWNER_HINT_COPY, TENDER_OWNER_TILE_LABELS } from "@/lib/tender-owner-language-pl";
import {
  buildKosztorysChecklistDisplay,
  buildKosztorysChecklistHint,
  buildOurEstimateDisplaySsot,
  buildOurEstimateTileDisplay,
  formatAwardCriteriaSummary,
  resolveTenderValue,
  resolvedAwardCriteria,
  resolvedCostStatus,
  resolvedTenderValuePln,
  resolvedWadiumDisplay,
  KOSZTORYS_NOT_PROVIDED_LABEL,
  PRZEDMIAR_VALUATION_READY_LABEL,
  traceSsotSnapshot,
} from "@/lib/tender-data-ssot";
import { OUR_ESTIMATE_TILE_NAV_HINT, canNavigateToBidDetails } from "@/lib/tender-bid-ux";

export type BidPrepItemStatus = "ok" | "partial" | "missing";

export interface BidPrepCheckItem {
  id: string;
  label: string;
  status: BidPrepItemStatus;
  display: string;
  displayLines?: string[];
  sourceLabel?: string;
  hint?: string;
  /** P2-G.1D — kafelek klikalny → szczegóły wyceny */
  navigateToBidDetails?: boolean;
  actionHint?: string;
}

export function computeBidPrepChecks(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  fit: TenderFitAssessment | null | undefined,
  bidProposal: TenderBidProposal | null | undefined,
  opts?: { pricingDeferred?: boolean; kosztorysSession?: KosztorysProcessSession },
): BidPrepCheckItem[] {
  const days = daysUntilTenderDeadline(item.submittingOffersDate);
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);
  const deadlineStr = item.submittingOffersDate
    ? new Date(item.submittingOffersDate).toLocaleString("pl-PL", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
    : null;

  const k = item.tenderDossier?.kosztorys;
  const kosztorysOk = Boolean(k?.ok);
  const costStatus = resolvedCostStatus(item);

  traceSsotSnapshot(item, swz ?? null);

  const valueResolved = resolveTenderValue(item, swz ?? null);
  const valuePln = resolvedTenderValuePln(item, swz ?? null);

  const profile = loadCompanyProfileLocal();
  const wadiumInfo = computeWadiumInfo(item, swz, profile.maxWadiumPln);

  const docCount = countTenderAttachments(item);
  const platformDoc = resolveTenderPlatformDocumentStatus(item);
  const scanSummary = item.tenderDossier?.scanSummary;
  const kosztorysAwaiting = isKosztorysAwaitingHeavyParse(item);
  const awaitingUx = resolveKosztorysAwaitingParseDisplay(item, opts?.kosztorysSession ?? {});
  const pricingDeferred = opts?.pricingDeferred ?? false;
  const estimateDisplay = buildOurEstimateTileDisplay({
    item,
    ourEstimatePln: item.ourEstimatePln,
    bidProposal,
    pricingDeferred,
  });
  const kosztorysMissingDisplay = costStatus === "NOT_FOUND"
    ? (awaitingUx
      ? awaitingUx.label
      : kosztorysAwaiting
        ? "Kosztorys oczekuje na przetworzenie"
        : docCount > 0
          ? KOSZTORYS_NOT_PROVIDED_LABEL
          : platformDoc.emptyMessage
            ?? platformDoc.detailLines?.[0]
            ?? "Brak plików")
    : costStatus === "FOUND_NO_VALUE"
      ? PRZEDMIAR_VALUATION_READY_LABEL
      : buildKosztorysChecklistDisplay(item);
  const kosztorysMissingHint = costStatus === "NOT_FOUND"
    ? (awaitingUx?.hint
      ?? (kosztorysAwaiting
        ? "Analiza dokumentów uruchomi się automatycznie po pobraniu załączników."
        : !kosztorysOk && scanSummary
          ? `${buildKosztorysMissingMessage(scanSummary)}`
          : !kosztorysOk && docCount === 0 && platformDoc.detailLines?.[1]
            ? platformDoc.detailLines[1]
            : !kosztorysOk
              ? "Pobierz załączniki BZP, szukaj u zamawiającego lub wgraj przedmiar PDF / ATH"
              : undefined))
    : buildKosztorysChecklistHint(item);

  const checks: BidPrepCheckItem[] = [
    {
      id: "deadline",
      label: TENDER_OWNER_TILE_LABELS.deadline,
      status: !deadlineStr ? "missing" : offerOpen ? "ok" : "partial",
      display: deadlineStr
        ? (offerOpen && days != null && days >= 0 ? `${deadlineStr} (${days} d.)` : deadlineStr)
        : "Brak daty",
      hint: !deadlineStr ? "Sprawdź ogłoszenie BZP" : !offerOpen ? "Termin minął" : undefined,
    },
    {
      id: "value",
      label: TENDER_OWNER_TILE_LABELS.value,
      status: valuePln != null ? "ok" : costStatus !== "NOT_FOUND" ? "partial" : "missing",
      display: valueResolved.display,
      hint: valueResolved.hint,
    },
    {
      id: "wadium",
      label: TENDER_OWNER_TILE_LABELS.wadium,
      status: wadiumInfo.blocked
        ? "partial"
        : wadiumInfo.amountPln != null || wadiumInfo.raw
          ? "ok"
          : "missing",
      display: wadiumInfo.blocked
        ? `${wadiumInfo.summary} — BLOKADA`
        : wadiumInfo.summary,
      hint: wadiumInfo.blocked
        ? `Limit profilu: ${profile.maxWadiumPln.toLocaleString("pl-PL")} zł`
        : !wadiumInfo.raw && wadiumInfo.amountPln == null
          ? "W SWZ/ogłoszeniu — użyj „Analizuj”"
          : undefined,
    },
    {
      id: "kosztorys",
      label: TENDER_OWNER_TILE_LABELS.kosztorys,
      status: costStatus !== "NOT_FOUND" ? "ok" : kosztorysAwaiting || docCount > 0 ? "partial" : "missing",
      display: kosztorysMissingDisplay,
      hint: kosztorysMissingHint,
    },
    {
      id: "criteria",
      label: TENDER_OWNER_TILE_LABELS.criteria,
      status: resolvedAwardCriteria(swz).length > 0 ? "ok" : fit ? "partial" : "missing",
      display: formatAwardCriteriaSummary(resolvedAwardCriteria(swz)),
      hint: resolvedAwardCriteria(swz).length === 0
        ? TENDER_OWNER_HINT_COPY.criteriaAfterAnalyze
        : undefined,
    },
    {
      id: "our-bid",
      label: TENDER_OWNER_TILE_LABELS.ourBid,
      status: item.ourEstimatePln != null
        ? "ok"
        : bidProposal?.ok && bidProposal.recommendedBidPln != null
          ? "ok"
          : isPricingAwaitingLazyEvaluation(item, bidProposal, undefined, pricingDeferred)
            ? "partial"
            : costStatus !== "NOT_FOUND"
              ? "partial"
              : isKosztorysAwaitingHeavyParse(item)
                ? "partial"
                : "missing",
      display: estimateDisplay.display,
      displayLines: estimateDisplay.lines,
      sourceLabel: estimateDisplay.sourceLabel,
      hint: item.ourEstimatePln == null && !bidProposal?.ok
        ? bidProposal?.warnings?.[0] ?? estimateDisplay.hint
        : estimateDisplay.hint,
      navigateToBidDetails: canNavigateToBidDetails(bidProposal?.ok, item.ourEstimatePln),
      actionHint: canNavigateToBidDetails(bidProposal?.ok, item.ourEstimatePln)
        ? OUR_ESTIMATE_TILE_NAV_HINT
        : undefined,
    },
  ];

  return checks;
}

export function summarizeSwzFindings(item: TenderPipelineItem, swz: TenderSwzAnalysis): string {
  const parts: string[] = [];
  const value = resolveTenderValue(item, swz);
  if (value.pln != null) parts.push(`Wartość: ${value.display}`);
  else if (swz.estimatedValueRaw) parts.push(`Wartość (tekst): ${swz.estimatedValueRaw.slice(0, 60)}`);
  const wadiumLabel = resolvedWadiumDisplay(swz);
  if (wadiumLabel) parts.push(`Wadium: ${wadiumLabel}`);
  if (swz.implementationDeadlineRaw) {
    parts.push(`Realizacja: ${swz.implementationDeadlineRaw.slice(0, 50)}`);
  }
  if (swz.referenceRequirement) parts.push("Są wymagania referencyjne");
  return parts.length ? parts.join(" · ") : "";
}

export function tenderListBidLine(item: TenderPipelineItem): string | null {
  const swz = item.swzAnalysis;
  const valuePln = estimatedValuePlnFromItem(item, swz ?? null);
  const profile = loadCompanyProfileLocal();
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const parts: string[] = [];
  if (valuePln != null) parts.push(fmtPln(valuePln));
  if (wadium.blocked) parts.push("wadium BLOKADA");
  else if (wadium.raw) parts.push(`wad. ${wadium.raw.replace(/\s+/g, " ").slice(0, 24)}`);
  else if (wadium.amountPln != null) parts.push(`wad. ${fmtPln(wadium.amountPln)}`);
  if (item.tenderDossier?.kosztorys?.ok) parts.push("kosztorys ✓");
  else if ((item.bzpDocuments?.length ?? 0) === 0 && !item.uploadedFile) parts.push("brak plików");
  else if (!item.tenderDossier?.kosztorys?.ok) parts.push("brak kosztorysu");
  return parts.length ? parts.join(" · ") : null;
}
