/**
 * P2-E.2 — integracja snapshotu kosztorysu (ATH/XLS) z wartością zamówienia i UI.
 */

import type { AthPreviewResult, AthPreviewSummaryLine } from "@/lib/ath-parser";
import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import type { TenderDossierScanSummary } from "@/lib/tender-dossier-pipeline";
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
  /wartość całkowita|kosztorys brutto|razem brutto|suma końcowa|wartość robót|wartość netto|całkowit/i;

/** Wyciąga totalValue z ATH — pole lub linie podsumowania. */
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
    if (last.total?.trim()) return last.total.trim();
  }

  return undefined;
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
  if (kosztorysFound) {
    if (opts.scanSummary?.estimateFound) {
      return {
        display: "Wycena wymaga ręcznego potwierdzenia",
        hint: "Suma z kosztorysu wykryta — wpisz „Nasz szacunek” po weryfikacji",
      };
    }
    return {
      display: "Wycena wymaga ręcznego potwierdzenia",
      hint: "Kosztorys znaleziony — brak automatycznej sumy; wpisz „Nasz szacunek”",
    };
  }
  if (opts.scanSummary?.sevenZipCount && !kosztorysFound) {
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

/** Wzbogaca snapshot o totalValue z summaryLines ATH. */
export function enrichKosztorysSnapshotFromPreview(
  preview: AthPreviewResult,
  snapshot: TenderKosztorysSnapshot,
): TenderKosztorysSnapshot {
  const totalValue = snapshot.totalValue?.trim()
    || extractTotalValueFromAthPreview(preview)
    || undefined;
  return {
    ...snapshot,
    ok: true,
    totalValue,
    rowCount: snapshot.rowCount || preview.rows.length,
  };
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
