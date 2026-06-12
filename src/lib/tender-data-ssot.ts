/**
 * P2-E.3 — Single Source of Truth dla danych przetargu (wartość, kosztorys, kryteria, wadium).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln, formatSwzWadiumDisplay } from "@/lib/tenders-bzp-swz";
import type { TenderAwardCriterion } from "@/lib/tenders-bzp-fit";
import type { TenderDossierScanSummary } from "@/lib/tender-dossier-pipeline";
import { costTypeDisplayLabel } from "@/lib/tender-cost-discovery";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";

function plnFromKosztorys(k: TenderKosztorysSnapshot | null | undefined): number | null {
  if (!k?.ok) return null;
  return parsePlnFromKosztorysTotal(k.totalValue, k.currency);
}

/** Jednolity komunikat braku wartości we wszystkich panelach UI. */
export const TENDER_VALUE_NOT_FOUND_LABEL =
  "Wartość zamówienia nie została wykryta w dokumentach";

export type TenderValueSource = "swz" | "dossier" | "estimate" | "fallback";

export type ResolvedCostStatus = "FOUND" | "FOUND_NO_VALUE" | "NOT_FOUND";

export interface ResolvedTenderValue {
  pln: number | null;
  source: TenderValueSource;
  display: string;
  hint?: string;
}

const ssotTraceBuffer: { at: string; detail: Record<string, unknown> }[] = [];
const SSOT_TRACE_MAX = 40;

export function traceSsotSnapshot(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): void {
  const value = resolveTenderValue(item, swz);
  const cost = resolvedCostStatus(item);
  const detail = {
    resolvedTenderValuePln: value.pln,
    valueSource: value.source,
    valueDisplay: value.display,
    resolvedCostStatus: cost,
    costLabel: resolvedCostStatusLabel(item, cost),
    resolvedAwardCriteria: resolvedAwardCriteria(swz).length,
    resolvedWadiumDisplay: resolvedWadiumDisplay(swz),
  };
  ssotTraceBuffer.unshift({ at: new Date().toISOString(), detail });
  if (ssotTraceBuffer.length > SSOT_TRACE_MAX) ssotTraceBuffer.length = SSOT_TRACE_MAX;
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[SSOT TRACE]", detail);
  }
}

export function getSsotTraceLog(): typeof ssotTraceBuffer {
  return [...ssotTraceBuffer];
}

export function clearSsotTraceLog(): void {
  ssotTraceBuffer.length = 0;
}

/** SSOT wartości zamówienia (PLN). Priorytet: swz → kosztorys → dossier.estimatePln. */
export function resolvedTenderValuePln(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): number | null {
  return resolveTenderValue(item, swz).pln;
}

export function resolveTenderValue(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): ResolvedTenderValue {
  if (swz?.estimatedValuePln != null) {
    return {
      pln: swz.estimatedValuePln,
      source: "swz",
      display: fmtPln(swz.estimatedValuePln),
    };
  }
  const fromKosztorys = plnFromKosztorys(item.tenderDossier?.kosztorys);
  if (fromKosztorys != null) {
    return {
      pln: fromKosztorys,
      source: "dossier",
      display: fmtPln(fromKosztorys),
      hint: "Wartość z sumy kosztorysu — zweryfikuj z SWZ/STWIOR.",
    };
  }
  const dossierEst = item.tenderDossier?.estimatePln;
  if (dossierEst != null) {
    return {
      pln: dossierEst,
      source: "estimate",
      display: fmtPln(dossierEst),
      hint: "Wartość wyliczona z analizy kosztorysu.",
    };
  }
  const cost = resolvedCostStatus(item);
  if (cost === "FOUND_NO_VALUE") {
    return {
      pln: null,
      source: "fallback",
      display: TENDER_VALUE_NOT_FOUND_LABEL,
      hint: "Kosztorys znaleziony — brak sumy końcowej w pliku.",
    };
  }
  return {
    pln: null,
    source: "fallback",
    display: TENDER_VALUE_NOT_FOUND_LABEL,
    hint: "Analizuj SWZ — wartość z SWZ/STWIOR/OPZ/kosztorysu.",
  };
}

export function resolvedCostStatus(item: TenderPipelineItem): ResolvedCostStatus {
  const k = item.tenderDossier?.kosztorys;
  const scan = item.tenderDossier?.scanSummary;
  const found = Boolean(k?.ok) || Boolean(scan?.kosztorysFound);
  if (!found) return "NOT_FOUND";
  const hasTotal = Boolean(k?.totalValue?.trim()) || plnFromKosztorys(k) != null;
  if (hasTotal) return "FOUND";
  return "FOUND_NO_VALUE";
}

export function resolvedCostStatusLabel(
  item: TenderPipelineItem,
  status: ResolvedCostStatus = resolvedCostStatus(item),
): string {
  const scan = item.tenderDossier?.scanSummary;
  if (status === "NOT_FOUND") return "Kosztorys nie znaleziony";
  const typeLabel = scan?.costDiscovery?.found
    ? costTypeDisplayLabel(scan.costDiscovery.type)
    : "kosztorys";
  if (status === "FOUND_NO_VALUE") {
    return `Kosztorys znaleziony (${typeLabel}), brak wartości`;
  }
  return `Kosztorys znaleziony (${typeLabel})`;
}

/** SSOT kryteriów — wyłącznie swzAnalysis (bez fallback HTML). */
export function resolvedAwardCriteria(
  swz: TenderSwzAnalysis | null | undefined,
): TenderAwardCriterion[] {
  return swz?.awardCriteria ?? [];
}

export const TENDER_CRITERIA_NOT_FOUND_LABEL =
  "Kryteria oceny nie zostały wykryte w dokumentach";

export function formatAwardCriteriaSummary(criteria: TenderAwardCriterion[], max = 3): string {
  if (criteria.length === 0) return TENDER_CRITERIA_NOT_FOUND_LABEL;
  const text = criteria.map((c) => {
    const w = c.weightPct != null ? ` ${c.weightPct}%` : c.maxPoints != null ? ` ${c.maxPoints} pkt` : "";
    return `${c.name}${w}`;
  }).slice(0, max).join(" · ");
  return criteria.length > max ? `${text} +${criteria.length - max}` : text;
}

export function resolvedAwardCriteriaDisplay(
  swz: TenderSwzAnalysis | null | undefined,
): string {
  const criteria = resolvedAwardCriteria(swz);
  if (criteria.length === 0) return TENDER_CRITERIA_NOT_FOUND_LABEL;
  return formatAwardCriteriaSummary(criteria);
}

export function resolvedWadiumDisplay(
  swz: TenderSwzAnalysis | null | undefined,
): string | null {
  if (!swz) return null;
  return formatSwzWadiumDisplay(swz);
}

export function buildOurEstimateDisplaySsot(opts: {
  item: TenderPipelineItem;
  ourEstimatePln?: number | null;
  recommendedBidPln?: number | null;
  bidProposalOk?: boolean;
}): { display: string; hint?: string } {
  if (opts.ourEstimatePln != null) {
    return { display: fmtPln(opts.ourEstimatePln) };
  }
  if (opts.bidProposalOk && opts.recommendedBidPln != null) {
    return { display: `Propozycja: ${fmtPln(opts.recommendedBidPln)}` };
  }
  const cost = resolvedCostStatus(opts.item);
  if (cost === "FOUND" || cost === "FOUND_NO_VALUE") {
    return {
      display: "Wycena wymaga ręcznego potwierdzenia",
      hint: cost === "FOUND_NO_VALUE"
        ? "Kosztorys bez sumy — wpisz „Nasz szacunek” po weryfikacji"
        : "Suma z kosztorysu — wpisz „Nasz szacunek” po weryfikacji",
    };
  }
  const scan = opts.item.tenderDossier?.scanSummary;
  if (scan?.sevenZipCount && scan.byType.ath === 0 && scan.byType.xlsx === 0) {
    return {
      display: "Wykryto tylko archiwa 7Z",
      hint: "Wymagane ręczne pobranie kosztorysu",
    };
  }
  return {
    display: "Brak pliku kosztorysowego (ATH/NOR/XML/XLS/XLSX)",
    hint: "Pobierz załączniki lub wgraj kosztorys",
  };
}

export function buildKosztorysChecklistDisplay(item: TenderPipelineItem): string {
  const status = resolvedCostStatus(item);
  if (status === "NOT_FOUND") {
    const scan = item.tenderDossier?.scanSummary;
    if (scan) {
      return scan.kosztorysFound
        ? resolvedCostStatusLabel(item, status)
        : "Kosztorys nie znaleziony";
    }
    return "Kosztorys nie znaleziony";
  }
  return resolvedCostStatusLabel(item, status);
}
