/**
 * P1C/P1D — Executive Summary: główne roboty z istniejącego snapshotu / parseResult / inferencji.
 */

import type { AthPreviewResult } from "@/lib/ath-parser";
import type { DocumentPreviewSummary } from "@/lib/tender-document-summary-header";
import { resolveCostDocKind, type CostDocKind, type DocumentSummarySource } from "@/lib/tender-document-summary-header";
import {
  inferWorkScope,
  sanitizeWorkCategoryName,
  type WorkScopeConfidence,
  type WorkScopeSource,
} from "@/lib/tender-work-scope-inference";
import { formatDocumentRowCount } from "@/lib/tender-document-summary-header";

export {
  dedupeWorkCategories,
  normalizeCategoryKey,
  sanitizeWorkCategoryName,
} from "@/lib/tender-work-scope-inference";

export const EXECUTIVE_SUMMARY_MAX_WORKS = 5;

export const EXECUTIVE_SUMMARY_NO_WORKS =
  "Nie udało się określić głównych rodzajów robót.";

/** @deprecated Użyj inferWorkScope — zachowane dla testów P1C. */
export function extractMainWorkCategories(opts: {
  snapshotCategoryNames?: string[] | null;
  parseResult?: AthPreviewResult | null;
  catalogDescriptions?: string[] | null;
  scopeDescription?: string | null;
  rowDescriptions?: string[] | null;
}): string[] {
  return inferWorkScope(opts).mainWorks;
}

export interface ExecutiveSummary {
  headline: string;
  rowCount: number | null;
  rowCountLabel: string;
  departmentCount: number | null;
  departmentLabel: string | null;
  mainWorks: string[];
  noWorksMessage: string | null;
  estimatedValue: string | null;
  costDocKind: CostDocKind;
  confidence: WorkScopeConfidence | null;
  confidenceLabel: string | null;
  workScopeSource: WorkScopeSource | null;
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

export function buildExecutiveSummary(
  ctx: DocumentSummarySource | null | undefined,
  docSummary: DocumentPreviewSummary | null,
  opts?: {
    parseResult?: AthPreviewResult | null;
    filename?: string;
    pdfTextPreview?: string | null;
    rowCountPending?: boolean;
  },
): ExecutiveSummary | null {
  const filename = opts?.filename ?? "";
  const kind = docSummary?.costDocKind
    ?? (ctx ? resolveCostDocKind({ ...ctx, filename }) : resolveCostDocKind({ filename }));
  if (!kind) return null;
  if (kind !== "przedmiar_pdf" && kind !== "kosztorys_pdf" && kind !== "ath" && kind !== "nor") {
    return null;
  }

  const rowCount = docSummary?.rowCount
    ?? ctx?.rowCount
    ?? opts?.parseResult?.rows?.length
    ?? null;

  const departmentCount = docSummary?.categoryCount
    ?? ctx?.categoryCount
    ?? countNamedCategories(ctx?.categoryNames)
    ?? countNamedCategoriesFromParse(opts?.parseResult)
    ?? null;

  const scope = inferWorkScope({
    snapshotCategoryNames: ctx?.categoryNames,
    catalogDescriptions: ctx?.catalogDescriptions,
    scopeDescription: ctx?.scopeDescription,
    rowDescriptions: ctx?.rowDescriptions,
    parseResult: opts?.parseResult,
    pdfTextPreview: opts?.pdfTextPreview,
  });

  const mainWorks = scope.mainWorks;

  const estimatedValue = docSummary?.valueLabel
    ?? (docSummary?.costStatus === "FOUND_WITH_VALUE" ? ctx?.totalValueDisplay : null)
    ?? null;

  const headline = docSummary?.headline ?? headlineForKind(kind);

  const rowCountDisplay = docSummary?.rowCountDisplay
    ?? formatDocumentRowCount(rowCount, { pending: opts?.rowCountPending });

  return {
    headline,
    rowCount: rowCount != null && rowCount >= 0 ? rowCount : null,
    rowCountLabel: rowCount != null && rowCount > 0
      ? formatCountLabel(rowCount, "pozycja", "pozycji")
      : rowCountDisplay,
    departmentCount: departmentCount != null && departmentCount > 0 ? departmentCount : null,
    departmentLabel: departmentCount != null && departmentCount > 0
      ? formatCountLabel(departmentCount, "dział", "działów")
      : null,
    mainWorks,
    noWorksMessage: mainWorks.length === 0 ? EXECUTIVE_SUMMARY_NO_WORKS : null,
    estimatedValue,
    costDocKind: kind,
    confidence: scope.confidence,
    confidenceLabel: scope.confidenceLabel,
    workScopeSource: scope.source,
  };
}

function countNamedCategories(names?: string[] | null): number | null {
  const n = names?.filter((x) => sanitizeWorkCategoryName(x)).length ?? 0;
  return n > 0 ? n : null;
}

function countNamedCategoriesFromParse(parseResult?: AthPreviewResult | null): number | null {
  const n = parseResult?.categories?.filter((c) => sanitizeWorkCategoryName(c.name ?? "")).length ?? 0;
  return n > 0 ? n : null;
}

function headlineForKind(kind: CostDocKind): string {
  const map: Record<CostDocKind, string> = {
    przedmiar_pdf: "PRZEDMIAR ROBÓT",
    kosztorys_pdf: "KOSZTORYS",
    ath: "KOSZTORYS ATH",
    nor: "KOSZTORYS NOR",
  };
  return map[kind];
}

export function shouldShowExecutiveSummary(
  summary: ExecutiveSummary | null,
): boolean {
  return summary != null;
}
