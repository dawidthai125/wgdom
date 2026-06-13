/**
 * P2-E.2 — integracja snapshotu kosztorysu (ATH/XLS) z wartością zamówienia i UI.
 */

import type { AthPreviewResult, AthPreviewSummaryLine } from "@/lib/ath-parser";
import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import {
  type TenderDossierScanSummary,
  isSevenZUnpackOk,
  sevenZKosztorysMissingLine,
} from "@/lib/tender-dossier-pipeline";
import {
  resolveTenderValue,
  resolvedTenderValuePln,
  TENDER_VALUE_NOT_FOUND_LABEL,
} from "@/lib/tender-data-ssot";

export type CostTraceStep =
  | "zip_found"
  | "ath_found"
  | "ath_parsed"
  | "snapshot_created"
  | "estimate_created"
  | "estimated_value_created"
  | "ui_state";

const costTraceBuffer: { step: CostTraceStep; at: string; filename: string; detail: Record<string, unknown> }[] = [];
const COST_TRACE_MAX = 60;

export function traceCostPipeline(
  step: CostTraceStep,
  filename: string,
  detail: Record<string, unknown> = {},
): void {
  const entry = { step, at: new Date().toISOString(), filename, detail };
  costTraceBuffer.unshift(entry);
  if (costTraceBuffer.length > COST_TRACE_MAX) costTraceBuffer.length = COST_TRACE_MAX;
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[COST TRACE]", step, filename, detail);
  }
}

export function getCostTraceLog(): typeof costTraceBuffer {
  return [...costTraceBuffer];
}

export function clearCostTraceLog(): void {
  costTraceBuffer.length = 0;
}

const SUMMARY_VALUE_LABEL_RE =
  /wartość całkowita|kosztorys brutto|razem brutto|suma końcowa|wartość robót|wartość netto|całkowit|kosztorys netto|suma pozycji|razem netto|\bnetto\b|łączna wartość netto|wartość kosztorysu/i;

function parseAthAmountToken(token: string | undefined): number {
  if (!token?.trim() || token === "—") return 0;
  const cleaned = token.replace(/\s/g, "").replace(",", ".");
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatAthSumPln(n: number): string {
  const fixed = n.toFixed(2);
  const [intPart, dec] = fixed.split(".");
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${withSpaces},${dec}`;
}

/** Suma pozycji ATH — total lub quantity × unitPrice (P2-E.4 fallback). */
export function sumAthPreviewRows(preview: AthPreviewResult): string | undefined {
  let sum = 0;
  let counted = 0;
  for (const row of preview.rows ?? []) {
    let rowTotal = parseAthAmountToken(row.total);
    if (rowTotal <= 0) {
      const q = parseAthAmountToken(row.quantity);
      const up = parseAthAmountToken(row.unitPrice);
      if (q > 0 && up > 0) rowTotal = +(q * up).toFixed(2);
    }
    if (rowTotal > 0) {
      sum += rowTotal;
      counted += 1;
    }
  }
  if (counted === 0 || sum <= 0) return undefined;
  return formatAthSumPln(sum);
}

/** Wyciąga totalValue z ATH — pole, linie podsumowania lub suma pozycji. */
export function extractTotalValueFromAthPreview(preview: AthPreviewResult): string | undefined {
  if (preview.totalValue?.trim()) return preview.totalValue.trim();

  for (const line of preview.summaryLines ?? []) {
    const fromLine = plnTokenFromSummaryLine(line);
    if (fromLine) return fromLine;
  }

  if (preview.summary?.trim()) {
    const m = preview.summary.match(/([\d\s]+[,.]\d{2}|\d[\d\s]{3,})/);
    if (m?.[1]) return m[1].trim();
  }

  const cats = preview.categories ?? [];
  if (cats.length > 0) {
    const last = cats[cats.length - 1];
    if (last.total?.trim() && last.total !== "—") return last.total.trim();
  }

  return sumAthPreviewRows(preview);
}

function plnTokenFromSummaryLine(line: AthPreviewSummaryLine): string | undefined {
  if (!SUMMARY_VALUE_LABEL_RE.test(line.label)) return undefined;
  const m = line.value.match(/([\d\s]+[,.]\d{2}|\d[\d\s]{3,})/);
  return m?.[1]?.trim() || undefined;
}

/** PLN z snapshotu kosztorysu (totalValue). */
export function plnFromKosztorysSnapshot(
  k: TenderKosztorysSnapshot | null | undefined,
): number | null {
  if (!k?.ok) return null;
  return parsePlnFromKosztorysTotal(k.totalValue, k.currency);
}

/** SSOT wartości zamówienia — delegacja do tender-data-ssot. */
export function resolveContractValuePln(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  _estimatePln?: number | null,
): number | null {
  return resolvedTenderValuePln(item, swz);
}

export function buildValueOrderDisplay(opts: {
  valuePln: number | null;
  kosztorysOk?: boolean;
  kosztorysHasTotal?: boolean;
  item?: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
}): { display: string; hint?: string } {
  if (opts.item != null) {
    return resolveTenderValue(opts.item, opts.swz);
  }
  if (opts.valuePln != null) {
    return { display: fmtPln(opts.valuePln) };
  }
  return {
    display: TENDER_VALUE_NOT_FOUND_LABEL,
    hint: opts.kosztorysOk && !opts.kosztorysHasTotal
      ? "Kosztorys znaleziony — brak sumy końcowej w pliku."
      : "Analizuj SWZ — wartość z SWZ/STWIOR/OPZ/kosztorysu.",
  };
}

export function buildOurEstimateDisplay(opts: {
  ourEstimatePln: number | null | undefined;
  kosztorysOk: boolean;
  scanSummary?: TenderDossierScanSummary | null;
  recommendedBidPln?: number | null;
  bidProposalOk?: boolean;
}): { display: string; hint?: string } {
  if (opts.ourEstimatePln != null) {
    return { display: fmtPln(opts.ourEstimatePln) };
  }
  if (opts.bidProposalOk && opts.recommendedBidPln != null) {
    return { display: `Propozycja: ${fmtPln(opts.recommendedBidPln)}` };
  }
  const kosztorysFound = opts.scanSummary?.kosztorysFound ?? opts.kosztorysOk;
  const hasPricedTotal = opts.scanSummary?.estimateFound
    || (opts.kosztorysOk && opts.scanSummary?.valueFound);
  if (kosztorysFound && !hasPricedTotal) {
    return {
      display: "Nie można automatycznie wyliczyć wyceny",
      hint: "ATH nie zawiera cen jednostkowych ani wartości pozycji.",
    };
  }
  if (kosztorysFound && hasPricedTotal) {
    return {
      display: "Wycena wymaga ręcznego potwierdzenia",
      hint: "Suma z kosztorysu wykryta — wpisz „Nasz szacunek” po weryfikacji",
    };
  }
  const sevenZLine = opts.scanSummary ? sevenZKosztorysMissingLine(opts.scanSummary) : null;
  if (sevenZLine) {
    return {
      display: sevenZLine,
      hint: isSevenZUnpackOk(opts.scanSummary!)
        ? "Archiwum rozpakowane — w dokumentacji zamawiającego brak pliku kosztorysowego"
        : "Sprawdź integralność pliku lub pobierz archiwum ręcznie",
    };
  }
  return {
    display: "Brak pliku kosztorysowego (ATH/NOR/XML/XLS/XLSX)",
    hint: "Pobierz załączniki lub wgraj kosztorys",
  };
}

/** Ustawia estimatePln z snapshotu kosztorysu gdy brak (P2-E.4). */
export function estimatePlnFromKosztorysSnapshot(
  kosztorys: TenderKosztorysSnapshot | null | undefined,
  currentEstimatePln?: number | null,
  traceFilename?: string,
): number | null {
  if (currentEstimatePln != null) return currentEstimatePln;
  if (!kosztorys?.ok || !kosztorys.totalValue?.trim()) return null;
  const pln = parsePlnFromKosztorysTotal(kosztorys.totalValue, kosztorys.currency);
  if (pln != null && traceFilename) {
    traceCostPipeline("estimate_created", traceFilename, {
      estimatePln: pln,
      totalValue: kosztorys.totalValue,
      source: "kosztorys_snapshot",
    });
  }
  return pln;
}

/** Wzbogaca snapshot o totalValue z summaryLines ATH. */
export function enrichKosztorysSnapshotFromPreview(
  preview: AthPreviewResult,
  snapshot: TenderKosztorysSnapshot,
): TenderKosztorysSnapshot {
  const totalValue = snapshot.totalValue?.trim()
    || extractTotalValueFromAthPreview(preview)
    || undefined;
  const enriched: TenderKosztorysSnapshot = {
    ...snapshot,
    ok: true,
    totalValue,
    rowCount: snapshot.rowCount || preview.rows.length,
  };
  if (totalValue && !snapshot.totalValue?.trim()) {
    traceCostPipeline("snapshot_created", snapshot.sourceFilename, {
      totalValue,
      rowCount: enriched.rowCount,
      source: "ath_preview_enrich",
    });
  }
  return enriched;
}

/** Uzupełnia swzAnalysis wartością z kosztorysu gdy brak w SWZ. */
export function mergeKosztorysValueIntoSwz(
  swz: TenderSwzAnalysis,
  kosztorys: TenderKosztorysSnapshot | null | undefined,
): TenderSwzAnalysis {
  if (swz.estimatedValuePln != null || !kosztorys?.ok) return swz;
  const pln = plnFromKosztorysSnapshot(kosztorys);
  if (pln == null) return swz;
  return {
    ...swz,
    estimatedValuePln: pln,
    estimatedValueRaw: kosztorys.totalValue
      ? `Kosztorys ${kosztorys.sourceFilename}: ${kosztorys.totalValue} ${kosztorys.currency ?? "PLN"}`
      : swz.estimatedValueRaw,
    sourceFilename: swz.sourceFilename ?? kosztorys.sourceFilename,
  };
}

// Re-export P2-E.5 — klasyfikacja i trace statusu kosztorysu (SSOT w tender-data-ssot).
export {
  classifyCostDocument,
  kosztorysHasPricedValue,
  traceCostStatus,
  getCostStatusTraceLog,
  clearCostStatusTraceLog,
  type ClassifiedCostDocument,
  type CostDocumentUiType,
} from "@/lib/tender-data-ssot";

export function traceCostUiState(
  filename: string,
  state: {
    kosztorysOk?: boolean;
    totalValue?: string | null;
    rowCount?: number;
    ourEstimatePln?: number | null;
    swzValue?: number | null;
    scanSummary?: TenderDossierScanSummary | null;
  },
): void {
  traceCostPipeline("ui_state", filename, {
    kosztorysOk: state.kosztorysOk ?? false,
    totalValue: state.totalValue ?? null,
    rowCount: state.rowCount ?? 0,
    ourEstimatePln: state.ourEstimatePln ?? null,
    swzValue: state.swzValue ?? null,
    scanKosztorysFound: state.scanSummary?.kosztorysFound ?? null,
    scanEstimateFound: state.scanSummary?.estimateFound ?? null,
    scanValueFound: state.scanSummary?.valueFound ?? null,
  });
}
