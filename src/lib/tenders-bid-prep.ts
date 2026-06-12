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
  buildKosztorysChecklistDisplay,
  buildOurEstimateDisplaySsot,
  formatAwardCriteriaSummary,
  resolveTenderValue,
  resolvedAwardCriteria,
  resolvedCostStatus,
  resolvedTenderValuePln,
  resolvedWadiumDisplay,
  traceSsotSnapshot,
} from "@/lib/tender-data-ssot";

export type BidPrepItemStatus = "ok" | "partial" | "missing";

export interface BidPrepCheckItem {
  id: string;
  label: string;
  status: BidPrepItemStatus;
  display: string;
  hint?: string;
}

export function computeBidPrepChecks(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  fit: TenderFitAssessment | null | undefined,
  bidProposal: TenderBidProposal | null | undefined,
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

  const docCount = (item.bzpDocuments?.length ?? 0) + (item.uploadedFile ? 1 : 0)
    + (item.externalDocDiscovery?.files?.length ?? 0);
  const platformDoc = resolveTenderPlatformDocumentStatus(item);
  const scanSummary = item.tenderDossier?.scanSummary;
  const estimateDisplay = buildOurEstimateDisplaySsot({
    item,
    ourEstimatePln: item.ourEstimatePln,
    recommendedBidPln: bidProposal?.recommendedBidPln,
    bidProposalOk: bidProposal?.ok,
  });
  const kosztorysMissingDisplay = costStatus === "NOT_FOUND"
    ? (docCount > 0
      ? "Kosztorys nie znaleziony"
      : platformDoc.emptyMessage
        ?? platformDoc.detailLines?.[0]
        ?? "Brak plików")
    : buildKosztorysChecklistDisplay(item);
  const kosztorysMissingHint = !kosztorysOk && scanSummary
    ? `${buildKosztorysMissingMessage(scanSummary)}`
    : !kosztorysOk && docCount === 0 && platformDoc.detailLines?.[1]
      ? platformDoc.detailLines[1]
      : !kosztorysOk
        ? "Pobierz załączniki BZP, szukaj u zamawiającego lub wgraj ATH/PDF"
        : undefined;

  const checks: BidPrepCheckItem[] = [
    {
      id: "deadline",
      label: "Termin ofert",
      status: !deadlineStr ? "missing" : offerOpen ? "ok" : "partial",
      display: deadlineStr
        ? (offerOpen && days != null && days >= 0 ? `${deadlineStr} (${days} d.)` : deadlineStr)
        : "Brak daty",
      hint: !deadlineStr ? "Sprawdź ogłoszenie BZP" : !offerOpen ? "Termin minął" : undefined,
    },
    {
      id: "value",
      label: "Wartość zamówienia",
      status: valuePln != null ? "ok" : costStatus !== "NOT_FOUND" ? "partial" : "missing",
      display: valueResolved.display,
      hint: valueResolved.hint,
    },
    {
      id: "wadium",
      label: "Wadium",
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
      label: "Kosztorys / przedmiar",
      status: costStatus !== "NOT_FOUND" ? "ok" : docCount > 0 ? "partial" : "missing",
      display: kosztorysMissingDisplay,
      hint: kosztorysMissingHint,
    },
    {
      id: "criteria",
      label: "Kryteria oceny",
      status: resolvedAwardCriteria(swz).length > 0 ? "ok" : fit ? "partial" : "missing",
      display: formatAwardCriteriaSummary(resolvedAwardCriteria(swz)),
      hint: resolvedAwardCriteria(swz).length === 0
        ? "Wynik analizy SWZ/STWIOR/OPZ — po „Analizuj SWZ”"
        : undefined,
    },
    {
      id: "our-bid",
      label: "Nasza wycena",
      status: item.ourEstimatePln != null
        ? "ok"
        : bidProposal?.ok && bidProposal.recommendedBidPln != null
          ? "partial"
          : costStatus !== "NOT_FOUND"
            ? "partial"
            : "missing",
      display: estimateDisplay.display,
      hint: item.ourEstimatePln == null && !bidProposal?.ok
        ? bidProposal?.warnings?.[0] ?? estimateDisplay.hint
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
