/**
 * NG-04.3 — BOQ ATH presentation helpers (#007 · #008 · #009).
 * resolve + cache builder only — UI consumes cache via BoqAthTooltip.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { KosztorysBoqRowViewModel } from "@/lib/tender-kosztorys-boq-explorer";
import {
  classifyCostDocument,
  type CostDocumentUiType,
  type ResolvedCostStatus,
} from "@/lib/tender-data-ssot";

export type BoqAthCellState =
  | "priced"
  | "no_value_doc"
  | "no_match"
  | "empty_priced_row";

/** Deterministic tooltip copy — jeden komunikat per stan (#009). */
export const BOQ_ATH_TOOLTIP_BY_STATE: Readonly<Record<BoqAthCellState, string>> = {
  no_value_doc: "W dokumencie znaleziono pozycję, ale nie zawiera ceny.",
  no_match: "Nie znaleziono odpowiadającej pozycji w danych ATH.",
  priced: "Cena została odczytana z dokumentu ATH.",
  empty_priced_row: "",
};

export interface BoqAthPresentationMeta {
  athCellState: BoqAthCellState;
  tooltipPl: string;
  knrHint: string;
  knrHintSource: "description";
}

export interface BoqAthDocumentMeta {
  sourceType: CostDocumentUiType;
  sourceFilename: string;
  confidenceLabel: string | null;
  pdfCaseLabel: string | null;
  explainCta: "open_ath_preview";
}

export function resolveBoqAthCellState(
  row: KosztorysBoqRowViewModel,
  ctx: { costStatus: ResolvedCostStatus },
): BoqAthCellState {
  if (ctx.costStatus === "FOUND_NO_VALUE") return "no_value_doc";
  if (row.athMatched && row.athUnitPrice) return "priced";
  if (row.athMatched && !row.athUnitPrice) return "empty_priced_row";
  return "no_match";
}

export function tooltipForBoqAthCellState(state: BoqAthCellState): string {
  return BOQ_ATH_TOOLTIP_BY_STATE[state];
}

export function resolveBoqAthPresentationMeta(
  row: KosztorysBoqRowViewModel,
  ctx: { costStatus: ResolvedCostStatus },
): BoqAthPresentationMeta {
  const athCellState = resolveBoqAthCellState(row, ctx);
  return {
    athCellState,
    tooltipPl: tooltipForBoqAthCellState(athCellState),
    knrHint: row.knrHint,
    knrHintSource: "description",
  };
}

/** Derived UI cache — jedyny punkt masowego wyliczenia ATH presentation (#005 · #006). */
export function buildBoqAthPresentationCache(
  rows: readonly KosztorysBoqRowViewModel[],
  ctx: { costStatus: ResolvedCostStatus },
): ReadonlyMap<string, BoqAthPresentationMeta> {
  const map = new Map<string, BoqAthPresentationMeta>();
  for (const row of rows) {
    map.set(row.rowKey, resolveBoqAthPresentationMeta(row, ctx));
  }
  return map;
}

export function bucketCostDiscoveryConfidence(confidence: number | null | undefined): string | null {
  if (confidence == null || Number.isNaN(confidence)) return null;
  if (confidence >= 0.85) return "Wysoka";
  if (confidence >= 0.6) return "Średnia";
  return "Niska";
}

function resolvePdfCaseLabel(
  pdfCase: 1 | 2 | 3 | null | undefined,
): string | null {
  if (pdfCase === 2) return "PDF — brak pozycji w przedmiarze";
  if (pdfCase === 3) return "PDF — skan / OCR";
  return null;
}

export function buildBoqAthDocumentMeta(
  item: TenderPipelineItem,
): BoqAthDocumentMeta | null {
  const classified = classifyCostDocument(item);
  if (!classified) return null;

  const k = item.tenderDossier?.kosztorys;
  const scan = item.tenderDossier?.scanSummary;
  const sourceFilename = k?.sourceFilename ?? scan?.costDiscovery?.source ?? "";
  if (!sourceFilename) return null;

  const pdfCase = k?.pdfPrzedmiarCase ?? scan?.pdfPrzedmiarCase;

  return {
    sourceType: classified.type,
    sourceFilename,
    confidenceLabel: bucketCostDiscoveryConfidence(scan?.costDiscovery?.confidence),
    pdfCaseLabel: resolvePdfCaseLabel(pdfCase),
    explainCta: "open_ath_preview",
  };
}

export function shortenAthSourceFilename(filename: string, maxLen = 36): string {
  if (filename.length <= maxLen) return filename;
  const tail = filename.slice(-(maxLen - 1));
  return `…${tail}`;
}

export function costDocumentTypeLabel(type: CostDocumentUiType): string {
  switch (type) {
    case "ATH": return "ATH";
    case "PDF": return "PDF";
    case "XLSX": return "XLSX";
    case "XML": return "XML";
    case "ZIP": return "ZIP";
    default: return type;
  }
}
