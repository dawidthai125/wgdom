/**
 * P2-E.3 — Single Source of Truth dla danych przetargu (wartość, kosztorys, kryteria, wadium).
 * P2-E.5 — FOUND_WITH_VALUE / FOUND_NO_VALUE (kosztorys bez cen ≠ kosztorys wyceniony).
 * AP2-S0 — przedmiar bez cen = podstawa wyceny; brak kosztorysu inwestorskiego = INFO (nie błąd).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln, formatSwzWadiumDisplay } from "@/lib/tenders-bzp-swz";
import type { TenderAwardCriterion } from "@/lib/tenders-bzp-fit";
import {
  type TenderDossierScanSummary,
  isSevenZUnpackOk,
  sevenZKosztorysMissingLine,
} from "@/lib/tender-dossier-pipeline";
import {
  isKosztorysAwaitingHeavyParse,
  isPricingAwaitingLazyEvaluation,
  KOSZTORYS_AWAITING_PARSE_HINT,
  KOSZTORYS_AWAITING_PARSE_LABEL,
  PRICING_AWAITING_TAB_HINT,
  PRICING_AWAITING_TAB_LABEL,
  PRICING_NEEDS_ANALYSIS_HINT,
  PRICING_NEEDS_ANALYSIS_LABEL,
} from "@/lib/tender-analysis-status-ux";
import {
  resolveKosztorysAwaitingParseDisplay,
  type KosztorysProcessSession,
} from "@/lib/tender-kosztorys-process-phase";
import type { TenderCostDocumentType } from "@/lib/tender-cost-discovery";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import type { TenderBidPricingMode, TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { getBidSourceLabel } from "@/lib/tender-bid-quality";
import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import {
  mapDossierKosztorysPresentation,
} from "@/lib/doc-detection";

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

/** AP2-S0 — copy SSOT (brak kosztorysu inwestorskiego ≠ błąd). */
export const KOSZTORYS_NOT_PROVIDED_LABEL =
  "Zamawiający nie udostępnił kosztorysu inwestorskiego.";

/** AP2-S0 — przedmiar z ilościami / zakresem umożliwia wycenę własną. */
export const PRZEDMIAR_VALUATION_READY_LABEL =
  "Wykryto przedmiar robót — możliwe przygotowanie wyceny.";

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
export type CostDocumentUiType = "ATH" | "PDF" | "XLSX" | "XML" | "ZIP";

export interface ClassifiedCostDocument {
  type: CostDocumentUiType;
  priced: boolean;
  rowCount: number;
}

const costStatusTraceBuffer: { at: string; detail: Record<string, unknown> }[] = [];
const COST_STATUS_TRACE_MAX = 40;
/** Console spam guard — in-memory last emitted fingerprint (buffers still append). */
let lastCostStatusConsoleFp = "";
let lastSsotConsoleFp = "";

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
  // Console: emit only when fingerprint changes (idle re-renders must not spam).
  const fp = `${detail.status}|${detail.type}|${detail.rowCount}|${detail.totalValue}|${detail.priced}`;
  if (fp !== lastCostStatusConsoleFp) {
    lastCostStatusConsoleFp = fp;
    if (typeof console !== "undefined" && console.debug) {
      console.debug("[COST STATUS TRACE]", detail);
    }
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
  if (/^(pdf_przedmiar|zip_pdf_przedmiar)$/.test(t)) return "PDF";
  if (/^zip_/.test(t)) return "ZIP";
  const base = (sourceFilename ?? "").split(" → ").pop()?.toLowerCase() ?? "";
  if (/\.(ath|nor)$/.test(base)) return "ATH";
  if (/\.xml$/.test(base)) return "XML";
  if (/\.xlsx$/.test(base)) return "XLSX";
  if (/\.xls$/.test(base)) return "XLSX";
  if (/\.zip$/.test(base)) return "ZIP";
  if (/\.pdf$/.test(base)) return "PDF";
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
  const fp = [
    detail.resolvedTenderValuePln,
    detail.valueSource,
    detail.resolvedCostStatus,
    detail.costLabel,
    detail.resolvedAwardCriteria,
    detail.resolvedWadiumDisplay,
    detail.costClassification?.type,
    detail.costClassification?.rowCount,
    detail.costClassification?.priced,
  ].join("|");
  if (fp !== lastSsotConsoleFp) {
    lastSsotConsoleFp = fp;
    if (typeof console !== "undefined" && console.debug) {
      console.debug("[SSOT TRACE]", detail);
    }
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

/**
 * AP2-S0 — czy dokumentacja umożliwia przygotowanie wyceny własnej.
 * True przy kosztorysie z cenami LUB przedmiarze/zakresie bez cen (`FOUND_NO_VALUE`).
 * Nie zmienia Pricing Gate (AP2-S6) — SSOT prezentacji / trust / confidence.
 */
export function canPrepareValuation(item: TenderPipelineItem): boolean {
  const status = resolvedCostStatus(item);
  return status === "FOUND_WITH_VALUE" || status === "FOUND_NO_VALUE";
}

/** P2-E.5 / AP2-S0 — główny komunikat + opcjonalny hint (druga linia UI). */
export function resolvedCostStatusDisplay(
  item: TenderPipelineItem,
  status: ResolvedCostStatus = resolvedCostStatus(item),
  kosztorysSession?: KosztorysProcessSession,
): ResolvedCostStatusDisplay {
  if (status === "NOT_FOUND") {
    const awaitingUx = resolveKosztorysAwaitingParseDisplay(item, kosztorysSession ?? {});
    if (awaitingUx) {
      return {
        display: awaitingUx.label,
        hint: awaitingUx.hint ?? KOSZTORYS_AWAITING_PARSE_HINT,
      };
    }
    if (isKosztorysAwaitingHeavyParse(item)) {
      return {
        display: KOSZTORYS_AWAITING_PARSE_LABEL,
        hint: KOSZTORYS_AWAITING_PARSE_HINT,
      };
    }
    return {
      display: KOSZTORYS_NOT_PROVIDED_LABEL,
      hint: "Brak kosztorysu inwestorskiego jest typowy — sprawdź przedmiar PDF i załączniki.",
    };
  }

  const classified = classifyCostDocument(item);
  const docType = classified?.type ?? "ATH";
  const rowCount = classified?.rowCount ?? item.tenderDossier?.kosztorys?.rowCount ?? 0;

  if (status === "FOUND_WITH_VALUE") {
    const pres = mapDossierKosztorysPresentation("FOUND_WITH_VALUE");
    return {
      display: `${pres.primaryLabelPl} · ${pres.supportingLabelPl} (${docType})`,
    };
  }

  const rowSuffix = rowCount > 0 ? ` (${rowCount} pozycji)` : "";
  const presNoPrice = mapDossierKosztorysPresentation("FOUND_NO_VALUE");
  return {
    display: PRZEDMIAR_VALUATION_READY_LABEL,
    hint: `${KOSZTORYS_NOT_PROVIDED_LABEL}\n${presNoPrice.primaryLabelPl} ${docType}${rowSuffix} — zakres robót bez cen jednostkowych.`,
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

export interface OurEstimateTileDisplay {
  display: string;
  lines?: string[];
  sourceLabel?: string;
  hint?: string;
}

export function buildOurEstimateTileDisplay(opts: {
  item: TenderPipelineItem;
  ourEstimatePln?: number | null;
  bidProposal?: TenderBidProposal | null;
  /** P3-UX-003 — true na Przeglądzie (lazy wycena). */
  pricingDeferred?: boolean;
}): OurEstimateTileDisplay {
  const { item, ourEstimatePln, bidProposal, pricingDeferred } = opts;
  if (ourEstimatePln != null) {
    return { display: fmtPln(ourEstimatePln) };
  }
  if (bidProposal?.ok && bidProposal.recommendedBidPln != null) {
    const source = bidProposal.sourceLabelPl ?? getBidSourceLabel(bidProposal.pricingMode);
    if (bidProposal.pricingMode === "catalog" && bidProposal.costPricePln != null) {
      const lines = [
        `Koszt wykonania: ${fmtPln(bidProposal.costPricePln)}`,
        `Rekomendowana: ${fmtPln(bidProposal.recommendedBidPln)}`,
        bidProposal.floorBidPln != null ? `Minimalna: ${fmtPln(bidProposal.floorBidPln)}` : null,
        source ? `Źródło: ${source}` : null,
        "Autorska wycena orientacyjna",
      ].filter(Boolean) as string[];
      return {
        display: lines.join(" · "),
        lines,
        sourceLabel: source ?? undefined,
        hint: bidProposal.qualityDetailPl ?? "Autorska wycena WGDOM z przedmiaru bez cen",
      };
    }
    if (bidProposal.pricingMode === "ath_priced") {
      const lines = [
        bidProposal.costPricePln != null
          ? `Koszt wykonania: ${fmtPln(bidProposal.costPricePln)}`
          : null,
        `Rekomendowana: ${fmtPln(bidProposal.recommendedBidPln)}`,
        bidProposal.floorBidPln != null ? `Minimalna: ${fmtPln(bidProposal.floorBidPln)}` : null,
        source ? `Źródło: ${source}` : null,
      ].filter(Boolean) as string[];
      return {
        display: lines.length > 0 ? lines.join(" · ") : `Propozycja: ${fmtPln(bidProposal.recommendedBidPln)}`,
        lines: lines.length > 0 ? lines : undefined,
        sourceLabel: source ?? undefined,
      };
    }
    return { display: `Propozycja: ${fmtPln(bidProposal.recommendedBidPln)}` };
  }
  return buildOurEstimateDisplaySsot({
    item,
    ourEstimatePln,
    recommendedBidPln: bidProposal?.recommendedBidPln,
    costPricePln: bidProposal?.costPricePln,
    bidProposalOk: bidProposal?.ok,
    pricingMode: bidProposal?.pricingMode ?? null,
    pricingDeferred,
  });
}

export function buildOurEstimateDisplaySsot(opts: {
  item: TenderPipelineItem;
  ourEstimatePln?: number | null;
  recommendedBidPln?: number | null;
  costPricePln?: number | null;
  bidProposalOk?: boolean;
  pricingMode?: TenderBidPricingMode | null;
  pricingDeferred?: boolean;
}): OurEstimateTileDisplay {
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
  if (isKosztorysAwaitingHeavyParse(opts.item)) {
    return {
      display: PRICING_AWAITING_TAB_LABEL,
      hint: PRICING_AWAITING_TAB_HINT,
    };
  }
  if (isPricingAwaitingLazyEvaluation(opts.item, undefined, opts.bidProposalOk, opts.pricingDeferred)) {
    return {
      display: PRICING_NEEDS_ANALYSIS_LABEL,
      hint: PRICING_NEEDS_ANALYSIS_HINT,
    };
  }
  if (cost === "FOUND_NO_VALUE") {
    return {
      display: PRZEDMIAR_VALUATION_READY_LABEL,
      hint: `${KOSZTORYS_NOT_PROVIDED_LABEL} Użyj wyceny katalogowej z ilości na zakładce Ceny.`,
    };
  }
  if (cost === "FOUND_WITH_VALUE") {
    return {
      display: "Wycena wymaga ręcznego potwierdzenia",
      hint: "Suma z kosztorysu — wpisz „Nasz szacunek” po weryfikacji",
    };
  }
  const scan = opts.item.tenderDossier?.scanSummary;
  const sevenZLine = scan ? sevenZKosztorysMissingLine(scan) : null;
  if (sevenZLine) {
    return {
      display: sevenZLine,
      hint: isSevenZUnpackOk(scan!)
        ? "Archiwum rozpakowane — sprawdź przedmiar PDF; kosztorys inwestorski często nie jest publikowany"
        : "Sprawdź integralność pliku lub pobierz archiwum ręcznie",
    };
  }
  return {
    display: KOSZTORYS_NOT_PROVIDED_LABEL,
    hint: "Pobierz załączniki lub wgraj przedmiar PDF / ATH",
  };
}

export function buildKosztorysChecklistDisplay(item: TenderPipelineItem): string {
  return resolvedCostStatusDisplay(item).display;
}

export function buildKosztorysChecklistHint(item: TenderPipelineItem): string | undefined {
  return resolvedCostStatusDisplay(item).hint;
}
