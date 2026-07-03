/**
 * P3.2B — view model raportu PREVIEW importu CSV (UI-only, bez zapisu).
 */

import type { MarketCsvPreviewReport, MarketCsvPreviewRow, MarketCsvPreviewStatus } from "@/lib/work-catalog";
import {
  MARKET_ORIGIN_LABELS_PL,
  isMarketRegionCode,
  marketRegionLabelPl,
  type MarketOriginId,
  type MarketRegionCode,
} from "@/lib/work-catalog";

export const DEFAULT_CSV_PREVIEW_REGION: MarketRegionCode = "wroclaw";

export type CsvPreviewDisplayStatus = MarketCsvPreviewStatus | "ignored";

export interface CsvPreviewTableRow {
  rowIndex: number;
  lineNumber: number | null;
  origin: MarketOriginId | null;
  originLabel: string;
  externalId: string | null;
  workId: string | null;
  workLabel: string;
  regionCode: string | null;
  regionLabel: string | null;
  confidence: number;
  reason: string;
  displayStatus: CsvPreviewDisplayStatus;
  baseStatus: MarketCsvPreviewStatus;
}

export interface CsvPreviewViewSummary {
  matched: number;
  lowConfidence: number;
  unmatched: number;
  rejected: number;
  ignored: number;
  total: number;
}

export interface CsvPreviewViewModel {
  regionFilter: MarketRegionCode;
  rows: CsvPreviewTableRow[];
  summary: CsvPreviewViewSummary;
}

const STATUS_LABELS_PL: Record<CsvPreviewDisplayStatus, string> = {
  matched: "Dopasowane",
  low_confidence: "Niska pewność",
  unmatched: "Bez mapowania",
  rejected: "Odrzucone",
  ignored: "Pominięte",
};

export function csvPreviewStatusLabelPl(status: CsvPreviewDisplayStatus): string {
  return STATUS_LABELS_PL[status];
}

export function flattenMarketCsvPreviewReport(report: MarketCsvPreviewReport): MarketCsvPreviewRow[] {
  return [
    ...report.matched,
    ...report.lowConfidence,
    ...report.unmatched,
    ...report.rejected,
  ];
}

function originLabel(origin: MarketOriginId | null): string {
  if (!origin) return "—";
  return MARKET_ORIGIN_LABELS_PL[origin];
}

function resolveWorkLabel(workId: string | null, workNameById: ReadonlyMap<string, string>): string {
  if (!workId) return "—";
  return workNameById.get(workId) ?? workId;
}

export function csvPreviewReasonPl(
  row: MarketCsvPreviewRow,
  displayStatus: CsvPreviewDisplayStatus,
  regionFilter: MarketRegionCode,
): string {
  if (displayStatus === "ignored") {
    const region = row.regionCode ? marketRegionLabelPl(row.regionCode as MarketRegionCode) : "nieznany";
    return `Region „${region}” poza filtrem (${marketRegionLabelPl(regionFilter)})`;
  }
  if (displayStatus === "rejected") {
    return row.errors.length > 0 ? row.errors.join(" · ") : "Odrzucono wiersz";
  }
  if (displayStatus === "unmatched") {
    return "Brak mapowania na robotę WGDOM";
  }
  if (displayStatus === "low_confidence") {
    return `Pewność ${(row.confidence * 100).toFixed(0)}% poniżej progu`;
  }
  return "Mapowanie potwierdzone";
}

function resolveDisplayStatus(
  row: MarketCsvPreviewRow,
  regionFilter: MarketRegionCode,
): CsvPreviewDisplayStatus {
  if (row.regionCode && row.regionCode !== regionFilter) {
    return "ignored";
  }
  return row.status;
}

export function buildCsvPreviewViewModel(
  report: MarketCsvPreviewReport,
  regionFilter: MarketRegionCode = DEFAULT_CSV_PREVIEW_REGION,
  workNameById: ReadonlyMap<string, string> = new Map(),
): CsvPreviewViewModel {
  const flat = flattenMarketCsvPreviewReport(report);

  const rows: CsvPreviewTableRow[] = flat.map((row) => {
    const displayStatus = resolveDisplayStatus(row, regionFilter);
    const regionLabel =
      row.regionCode && isMarketRegionCode(row.regionCode)
        ? marketRegionLabelPl(row.regionCode)
        : row.regionCode;

    return {
      rowIndex: row.rowIndex,
      lineNumber: row.lineNumber,
      origin: row.origin,
      originLabel: originLabel(row.origin),
      externalId: row.externalId,
      workId: row.workId,
      workLabel: resolveWorkLabel(row.workId, workNameById),
      regionCode: row.regionCode,
      regionLabel,
      confidence: row.confidence,
      reason: csvPreviewReasonPl(row, displayStatus, regionFilter),
      displayStatus,
      baseStatus: row.status,
    };
  });

  rows.sort((a, b) => (a.lineNumber ?? a.rowIndex) - (b.lineNumber ?? b.rowIndex));

  const summary: CsvPreviewViewSummary = {
    matched: 0,
    lowConfidence: 0,
    unmatched: 0,
    rejected: 0,
    ignored: 0,
    total: rows.length,
  };

  for (const row of rows) {
    switch (row.displayStatus) {
      case "matched":
        summary.matched += 1;
        break;
      case "low_confidence":
        summary.lowConfidence += 1;
        break;
      case "unmatched":
        summary.unmatched += 1;
        break;
      case "rejected":
        summary.rejected += 1;
        break;
      case "ignored":
        summary.ignored += 1;
        break;
      default:
        break;
    }
  }

  return { regionFilter, rows, summary };
}

export function filterCsvPreviewTableRows(
  rows: CsvPreviewTableRow[],
  statusFilter: CsvPreviewDisplayStatus | "all",
): CsvPreviewTableRow[] {
  if (statusFilter === "all") return rows;
  return rows.filter((row) => row.displayStatus === statusFilter);
}

export function formatCsvPreviewConfidence(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${(value * 100).toFixed(0)}%`;
}
