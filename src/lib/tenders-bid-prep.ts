import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import { estimatedValuePlnFromItem } from "@/lib/tenders-bzp-fit";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import { isTenderOpenForOffers, daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { computeWadiumInfo } from "@/lib/tenders-wadium";

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

  const valuePln = estimatedValuePlnFromItem(item, swz ?? null)
    ?? parsePlnFromKosztorysTotal(
      item.tenderDossier?.kosztorys?.totalValue,
      item.tenderDossier?.kosztorys?.currency,
    );

  const profile = loadCompanyProfileLocal();
  const wadiumInfo = computeWadiumInfo(item, swz, profile.maxWadiumPln);

  const kosztorysOk = Boolean(item.tenderDossier?.kosztorys?.ok);
  const docCount = (item.bzpDocuments?.length ?? 0) + (item.uploadedFile ? 1 : 0)
    + (item.externalDocDiscovery?.files?.length ?? 0);

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
      status: valuePln != null ? "ok" : swz?.estimatedValueRaw ? "partial" : "missing",
      display: valuePln != null
        ? fmtPln(valuePln)
        : swz?.estimatedValueRaw?.slice(0, 80) ?? "Nieznana",
      hint: valuePln == null ? "Analizuj SWZ lub wgraj kosztorys PDF" : undefined,
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
      status: kosztorysOk ? "ok" : docCount > 0 ? "partial" : "missing",
      display: kosztorysOk
        ? `${item.tenderDossier!.kosztorys!.totalValue || "?"} ${item.tenderDossier!.kosztorys!.currency || "PLN"}`
        : docCount > 0 ? `${docCount} plik(ów) — nie sparsowano` : "Brak plików",
      hint: !kosztorysOk ? "Pobierz załączniki BZP, szukaj u zamawiającego lub wgraj ATH/PDF" : undefined,
    },
    {
      id: "criteria",
      label: "Kryteria oceny",
      status: (fit?.awardCriteria?.length ?? 0) > 0 ? "ok" : fit ? "partial" : "missing",
      display: (fit?.awardCriteria?.length ?? 0) > 0
        ? fit!.awardCriteria.map((c) => c.name).slice(0, 2).join(", ")
          + (fit!.awardCriteria.length > 2 ? ` +${fit!.awardCriteria.length - 2}` : "")
        : fit?.priceWeightPct != null
          ? `Cena ~${fit.priceWeightPct}%`
          : "Po analizie ogłoszenia",
      hint: !(fit?.awardCriteria?.length) ? "Wynika z analizy tekstu ogłoszenia/SWZ" : undefined,
    },
    {
      id: "our-bid",
      label: "Nasza wycena",
      status: item.ourEstimatePln != null
        ? "ok"
        : bidProposal?.ok && bidProposal.recommendedBidPln != null
          ? "partial"
          : "missing",
      display: item.ourEstimatePln != null
        ? fmtPln(item.ourEstimatePln)
        : bidProposal?.ok && bidProposal.recommendedBidPln != null
          ? `Propozycja: ${fmtPln(bidProposal.recommendedBidPln)}`
          : "Uzupełnij po kosztorysie",
      hint: item.ourEstimatePln == null && !bidProposal?.ok
        ? bidProposal?.warnings?.[0] ?? "Wymaga kosztorysu ATH/XLSX"
        : undefined,
    },
  ];

  return checks;
}

export function summarizeSwzFindings(swz: TenderSwzAnalysis): string {
  const parts: string[] = [];
  if (swz.estimatedValuePln != null) parts.push(`Wartość: ${fmtPln(swz.estimatedValuePln)}`);
  else if (swz.estimatedValueRaw) parts.push(`Wartość (tekst): ${swz.estimatedValueRaw.slice(0, 60)}`);
  if (swz.wadiumRaw) parts.push(`Wadium: ${swz.wadiumRaw}`);
  else if (swz.wadiumPln != null) parts.push(`Wadium: ${fmtPln(swz.wadiumPln)}`);
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
