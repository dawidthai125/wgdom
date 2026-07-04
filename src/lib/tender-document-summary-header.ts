/**
 * P1B — nagłówek podsumowania dokumentu kosztorysowego (frontend, dane ze snapshotu).
 */

import type { AthPreviewResult } from "@/lib/ath-parser";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import type { CostDocumentUiType, ResolvedCostStatus } from "@/lib/tender-data-ssot";

export type CostDocKind = "przedmiar_pdf" | "kosztorys_pdf" | "ath" | "nor";

/** Pola podsumowania przekazywane w previewContext (P1B). */
export interface DocumentSummarySource {
  costStatus?: ResolvedCostStatus;
  docType?: CostDocumentUiType;
  costDocKind?: CostDocKind;
  totalValueDisplay?: string | null;
  sourceLabel?: string;
  categoryCount?: number;
  /** P1C — nazwy działów ze snapshotu (bez ponownego parsowania). */
  categoryNames?: string[];
  /** P1D — opisy z catalogQuantities (snapshot). */
  catalogDescriptions?: string[];
  /** P1D — przedmiot zamówienia z brief. */
  scopeDescription?: string | null;
  /** P1D — opisy wierszy ze snapshotu rows. */
  rowDescriptions?: string[];
  rowCount?: number;
  pdfRole?: string;
}

export interface DocumentPreviewSummary {
  headline: string;
  typeLabel: string;
  rowCount: number | null;
  rowCountDisplay: string;
  statusLabel: string;
  valueLabel: string | null;
  pricingLabel: string;
  sourceLabel: string;
  categoryCount: number | null;
  costStatus: ResolvedCostStatus;
  costDocKind: CostDocKind;
}

/** Etykieta liczby pozycji — bez fałszywego „0” gdy brak danych strukturalnych. */
export function formatDocumentRowCount(
  rowCount: number | null | undefined,
  opts?: { pending?: boolean },
): string {
  if (opts?.pending) return "W trakcie analizy";
  if (rowCount != null && rowCount > 0) return String(rowCount);
  if (rowCount === 0) return "Nie ustalono liczby pozycji";
  return "—";
}

export function resolveCostDocKind(
  ctx: DocumentSummarySource & { filename?: string },
): CostDocKind | null {
  if (ctx.costDocKind) return ctx.costDocKind;
  if (ctx.pdfRole === "przedmiar_pdf") return "przedmiar_pdf";
  if (ctx.pdfRole === "kosztorys_pdf") return "kosztorys_pdf";
  const base = (ctx.filename ?? "").split(" → ").pop()?.toLowerCase() ?? "";
  if (/\.nor$/i.test(base)) return "nor";
  if (/\.(ath|xml)$/i.test(base) || ctx.docType === "ATH" || ctx.docType === "XML") {
    return /\.nor$/i.test(base) ? "nor" : "ath";
  }
  return null;
}

export function mapCostStatusLabel(
  status: ResolvedCostStatus,
  kind: CostDocKind,
): string {
  if (status === "NOT_FOUND") return "Nie wykryto danych kosztorysowych";
  if (status === "FOUND_WITH_VALUE") {
    return kind === "ath" || kind === "nor" ? "Kosztorys wyceniony" : "Zawiera ceny";
  }
  return "Przedmiar bez cen";
}

export function mapPricingLabel(status: ResolvedCostStatus): string {
  if (status === "FOUND_WITH_VALUE") return "Gotowa";
  if (status === "FOUND_NO_VALUE") return "Wymaga kalkulacji";
  return "Brak danych";
}

const HEADLINES: Record<CostDocKind, string> = {
  przedmiar_pdf: "PRZEDMIAR ROBÓT",
  kosztorys_pdf: "KOSZTORYS",
  ath: "KOSZTORYS ATH",
  nor: "KOSZTORYS NOR",
};

const TYPE_LABELS: Record<CostDocKind, string> = {
  przedmiar_pdf: "Przedmiar PDF",
  kosztorys_pdf: "Kosztorys PDF",
  ath: "ATH",
  nor: "NOR",
};

function formatTotalValue(totalValue?: string | null, currency?: string | null): string | null {
  const pln = parsePlnFromKosztorysTotal(totalValue, currency);
  if (pln != null) return fmtPln(pln);
  if (totalValue?.trim()) return totalValue.trim();
  return null;
}

export function buildDocumentPreviewSummary(
  ctx?: DocumentSummarySource | null,
  opts?: {
    parseResult?: AthPreviewResult | null;
    filename?: string;
    rowCount?: number;
    rowCountPending?: boolean;
  },
): DocumentPreviewSummary | null {
  const filename = opts?.filename ?? "";
  const kind = ctx ? resolveCostDocKind({ ...ctx, filename }) : resolveCostDocKind({ filename });
  if (!kind) return null;

  const costStatus = ctx?.costStatus ?? inferCostStatusFromParse(opts?.parseResult);
  const rawRowCount = ctx?.rowCount
    ?? opts?.rowCount
    ?? opts?.parseResult?.rows?.length
    ?? null;
  const rowCount = rawRowCount != null && rawRowCount > 0 ? rawRowCount : (rawRowCount === 0 ? 0 : null);

  const valueLabel = costStatus === "FOUND_WITH_VALUE"
    ? (ctx?.totalValueDisplay ?? formatTotalValue(opts?.parseResult?.totalValue, opts?.parseResult?.currency))
    : null;

  const sourceLabel = ctx?.sourceLabel
    ?? ((filename.split(" → ").pop() ?? filename) || "—");

  return {
    headline: HEADLINES[kind],
    typeLabel: ctx?.docType && kind === "ath" && ctx.docType !== "ATH"
      ? ctx.docType
      : TYPE_LABELS[kind],
    rowCount,
    rowCountDisplay: formatDocumentRowCount(rowCount, { pending: opts?.rowCountPending }),
    statusLabel: mapCostStatusLabel(costStatus, kind),
    valueLabel,
    pricingLabel: mapPricingLabel(costStatus),
    sourceLabel,
    categoryCount: ctx?.categoryCount ?? countCategoriesFromParse(opts?.parseResult),
    costStatus,
    costDocKind: kind,
  };
}

function inferCostStatusFromParse(parseResult?: AthPreviewResult | null): ResolvedCostStatus {
  if (!parseResult?.ok && !(parseResult?.rows?.length)) return "NOT_FOUND";
  const pln = parsePlnFromKosztorysTotal(parseResult?.totalValue, parseResult?.currency);
  if (pln != null) return "FOUND_WITH_VALUE";
  if ((parseResult?.rows?.length ?? 0) > 0) return "FOUND_NO_VALUE";
  return "NOT_FOUND";
}

function countCategoriesFromParse(parseResult?: AthPreviewResult | null): number | null {
  const n = parseResult?.categories?.filter((c) => c.name?.trim()).length ?? 0;
  return n > 0 ? n : null;
}

export function shouldShowDocumentSummary(
  summary: DocumentPreviewSummary | null,
  opts: {
    showTextView: boolean;
    showPdf: boolean;
    showKosztorysTable: boolean;
  },
): boolean {
  if (!summary) return false;
  return opts.showTextView || opts.showPdf || opts.showKosztorysTable;
}
