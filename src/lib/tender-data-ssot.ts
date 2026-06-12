/**
 * P2-E.3 — Single Source of Truth dla danych przetargu (wartość, kosztorys, kryteria, wadium).
 * P2-E.5 — FOUND_WITH_VALUE / FOUND_NO_VALUE (kosztorys bez cen ≠ kosztorys wyceniony).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln, formatSwzWadiumDisplay } from "@/lib/tenders-bzp-swz";
import type { TenderAwardCriterion } from "@/lib/tenders-bzp-fit";
import type { TenderDossierScanSummary } from "@/lib/tender-dossier-pipeline";
import type { TenderCostDocumentType } from "@/lib/tender-cost-discovery";
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

/** P2-E.5 — kosztorys wyceniony vs przedmiar bez cen. */
export type ResolvedCostStatus = "FOUND_WITH_VALUE" | "FOUND_NO_VALUE" | "NOT_FOUND";

export interface ResolvedTenderValue {
  pln: number | null;
  source: TenderValueSource;
  display: string;
  hint?: string;
}

export interface ResolvedCostStatusDisplay {
  display: string;
  hint?: string;
}

/** P2-E.5 — typ dokumentu kosztorysowego do UI. */
export type CostDocumentUiType = "ATH" | "XLSX" | "XML" | "ZIP";

export interface ClassifiedCostDocument {
  type: CostDocumentUiType;
  priced: boolean;
  rowCount: number;
}

const costStatusTraceBuffer: { at: string; detail: Record<string, unknown> }[] = [];
const COST_STATUS_TRACE_MAX = 40;

export function traceCostStatus(
  status: ResolvedCostStatus,
  classified: ClassifiedCostDocument | null,
  totalValue?: string | null,
): void {
  const detail = {
    status,
    type: classified?.type ?? null,
    rowCount: classified?.rowCount ?? 0,
    totalValue: totalValue ?? null,
    priced: classified?.priced ?? false,
  };
  costStatusTraceBuffer.unshift({ at: new Date().toISOString(), detail });
  if (costStatusTraceBuffer.length > COST_STATUS_TRACE_MAX) {
    costStatusTraceBuffer.length = COST_STATUS_TRACE_MAX;
  }
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[COST STATUS TRACE]", detail);
  }
}

export function getCostStatusTraceLog(): typeof costStatusTraceBuffer {
  return [...costStatusTraceBuffer];
}

export function clearCostStatusTraceLog(): void {
  costStatusTraceBuffer.length = 0;
}

/** Czy snapshot kosztorysu ma wartość > 0 PLN (P2-E.5). */
export function kosztorysHasPricedValue(
  k: TenderKosztorysSnapshot | null | undefined,
): boolean {
  return plnFromKosztorys(k) != null;
}

function mapDiscoveryTypeToUi(
  discoveryType: TenderCostDocumentType | undefined,
  sourceFilename?: string,
): CostDocumentUiType {
  const t = discoveryType ?? "";
  if (/^(ath|nor|zip_ath|zip_nor)$/.test(t)) return "ATH";
  if (/^(xml|zip_xml)$/.test(t)) return "XML";
  if (/^(xls|xlsx|zip_xls|zip_xlsx)$/.test(t)) return "XLSX";
  if (/^zip_/.test(t)) return "ZIP";
  const base = (sourceFilename ?? "").split(" → ").pop()?.toLowerCase() ?? "";
  if (/\.(ath|nor)$/.test(base)) return "ATH";
  if (/\.xml$/.test(base)) return "XML";
  if (/\.xlsx$/.test(base)) return "XLSX";
  if (/\.xls$/.test(base)) return "XLSX";
  if (/\.zip$/.test(base)) return "ZIP";
  return "ATH";
}

/** P2-E.5 — klasyfikacja dokumentu kosztorysowego (typ, wycena, liczba pozycji). */
export function classifyCostDocument(item: TenderPipelineItem): ClassifiedCostDocument | null {
  const k = item.tenderDossier?.kosztorys;
  const scan = item.tenderDossier?.scanSummary;
  const found = Boolean(k?.ok) || Boolean(scan?.kosztorysFound);
  if (!found) return null;

  const source = k?.sourceFilename ?? scan?.costDiscovery?.source ?? "";
  const type = mapDiscoveryTypeToUi(scan?.costDiscovery?.type, source);
  return {
    type,
    priced: kosztorysHasPricedValue(k),
    rowCount: k?.rowCount ?? 0,
  };
}

const ssotTraceBuffer: { at: string; detail: Record<string, unknown> }[] = [];
const SSOT_TRACE_MAX = 40;

export function traceSsotSnapshot(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): void {
  const value = resolveTenderValue(item, swz);
  const cost = resolvedCostStatus(item);
  const classified = classifyCostDocument(item);
  traceCostStatus(cost, classified, item.tenderDossier?.kosztorys?.totalValue ?? null);
  const costUi = resolvedCostStatusDisplay(item, cost);
  const detail = {
    resolvedTenderValuePln: value.pln,
    valueSource: value.source,
    valueDisplay: value.display,
    resolvedCostStatus: cost,
    costLabel: costUi.display,
    costHint: costUi.hint ?? null,
    resolvedAwardCriteria: resolvedAwardCriteria(swz).length,
    resolvedWadiumDisplay: resolvedWadiumDisplay(swz),
    costClassification: classified,
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
      hint: "Brak cen i wartości w pliku ATH — dokument zawiera zakres robót bez wyceny.",
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
  if (kosztorysHasPricedValue(k)) return "FOUND_WITH_VALUE";
  return "FOUND_NO_VALUE";
}

/** P2-E.5 — główny komunikat + opcjonalny hint (druga linia UI). */
export function resolvedCostStatusDisplay(
  item: TenderPipelineItem,
  status: ResolvedCostStatus = resolvedCostStatus(item),
): ResolvedCostStatusDisplay {
  if (status === "NOT_FOUND") {
    return { display: "Nie znaleziono kosztorysu." };
  }

  const classified = classifyCostDocument(item);
  const docType = classified?.type ?? "ATH";
  const rowCount = classified?.rowCount ?? item.tenderDossier?.kosztorys?.rowCount ?? 0;

  if (status === "FOUND_WITH_VALUE") {
    return { display: `Kosztorys wyceniony (${docType})` };
  }

  const rowSuffix = rowCount > 0 ? ` (${rowCount} pozycji)` : "";
  return {
    display: `Przedmiar ${docType} znaleziony${rowSuffix}`,
    hint: "Brak cen i wartości w pliku.\nDokument zawiera zakres robót bez wyceny.",
  };
}

export function resolvedCostStatusLabel(
  item: TenderPipelineItem,
  status: ResolvedCostStatus = resolvedCostStatus(item),
): string {
  return resolvedCostStatusDisplay(item, status).display;
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
  costPricePln?: number | null;
  bidProposalOk?: boolean;
  pricingMode?: "ath_priced" | "catalog" | null;
}): { display: string; hint?: string } {
  if (opts.ourEstimatePln != null) {
    return { display: fmtPln(opts.ourEstimatePln) };
  }
  if (opts.bidProposalOk && opts.recommendedBidPln != null) {
    if (opts.pricingMode === "catalog" && opts.costPricePln != null) {
      return {
        display: `Koszt wykonania: ${fmtPln(opts.costPricePln)} · Propozycja: ${fmtPln(opts.recommendedBidPln)}`,
        hint: "Autorska wycena WGDOM z przedmiaru bez cen",
      };
    }
    return { display: `Propozycja: ${fmtPln(opts.recommendedBidPln)}` };
  }
  const cost = resolvedCostStatus(opts.item);
  if (cost === "FOUND_NO_VALUE") {
    return {
      display: "Nie można automatycznie wyliczyć wyceny",
      hint: "ATH nie zawiera cen jednostkowych ani wartości pozycji.",
    };
  }
  if (cost === "FOUND_WITH_VALUE") {
    return {
      display: "Wycena wymaga ręcznego potwierdzenia",
      hint: "Suma z kosztorysu — wpisz „Nasz szacunek” po weryfikacji",
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
  return resolvedCostStatusDisplay(item).display;
}

export function buildKosztorysChecklistHint(item: TenderPipelineItem): string | undefined {
  return resolvedCostStatusDisplay(item).hint;
}
