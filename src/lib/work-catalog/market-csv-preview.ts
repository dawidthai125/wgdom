/**
 * P3.2A — bezpieczny importer CSV w trybie PREVIEW (bez zapisu, bez marketQuotes).
 * Flow: CSV → Parser → Adapter → Mapping Dictionary → Preview Report
 */

import {
  parseMarketCsv,
  type MarketCsvParseOptions,
  type MarketCsvParseResult,
} from "@/lib/work-catalog/market-csv-parser";
import { adaptMarketSourceRecord } from "@/lib/work-catalog/market-source-adapters/index";
import {
  buildMarketWorkMappingIndexForOrigin,
  findMapping,
  type MarketWorkMappingStore,
} from "@/lib/work-catalog/market-work-mapping";
import {
  isMarketOriginId,
  MARKET_MIN_CONFIDENCE_DEFAULT,
  type MarketOriginId,
  type MarketSourceSnapshot,
} from "@/lib/work-catalog/market-sources";

export type MarketCsvPreviewStatus = "matched" | "low_confidence" | "unmatched" | "rejected";

export interface MarketCsvPreviewRow {
  rowIndex: number;
  lineNumber: number | null;
  origin: MarketOriginId | null;
  externalId: string | null;
  workId: string | null;
  confidence: number;
  status: MarketCsvPreviewStatus;
  regionCode: string | null;
  price: number | null;
  errors: string[];
  snapshot: MarketSourceSnapshot | null;
}

export interface MarketCsvPreviewReport {
  mode: "preview";
  parse: MarketCsvParseResult;
  matched: MarketCsvPreviewRow[];
  lowConfidence: MarketCsvPreviewRow[];
  unmatched: MarketCsvPreviewRow[];
  rejected: MarketCsvPreviewRow[];
  summary: {
    totalInputRows: number;
    parsedRows: number;
    parseRejectedLines: number;
    matched: number;
    lowConfidence: number;
    unmatched: number;
    rejected: number;
  };
}

export interface MarketCsvPreviewOptions {
  fallbackUpdatedAt?: string;
  mappingStore?: MarketWorkMappingStore;
  /** Gdy CSV nie ma kolumny origin — wymagane dla wierszy bez origin. */
  defaultOrigin?: MarketOriginId;
  lowConfidenceThreshold?: number;
  parse?: MarketCsvParseOptions;
}

const DEFAULT_FALLBACK_UPDATED_AT = "2026-06-13T00:00:00.000Z";

const CSV_HEADER_ALIASES: Readonly<Record<string, string>> = {
  workid: "workId",
  work_id: "workId",
  robota: "workId",
  origin: "origin",
  zrodlo: "origin",
  source: "origin",
  region: "region",
  regioncode: "regionCode",
  region_code: "regionCode",
  price: "price",
  cena: "price",
  updatedat: "updatedAt",
  updated_at: "updatedAt",
  data: "updatedAt",
  confidence: "confidence",
  pewnosc: "confidence",
  kbcode: "kbCode",
  kb_code: "kbCode",
  externalcode: "externalCode",
  external_code: "externalCode",
  kod: "externalCode",
  interbudid: "interbudId",
  interbud_id: "interbudId",
  pozycja: "pozycja",
  sekocencode: "sekocenCode",
  sekocen_code: "sekocenCode",
  coverage: "coverage",
  samplecount: "sampleCount",
};

function normalizeCsvHeaderKey(key: string): string {
  const trimmed = key.trim();
  const lower = trimmed.toLowerCase();
  return CSV_HEADER_ALIASES[lower] ?? trimmed;
}

export function csvRowToAdapterRecord(row: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const canonical = normalizeCsvHeaderKey(key);
    if (value === "") continue;
    out[canonical] = value;
  }
  return out;
}

export function resolveCsvExternalId(
  origin: MarketOriginId,
  record: Record<string, unknown>,
): string | null {
  const pick = (value: unknown): string | null =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  switch (origin) {
    case "kb_pl":
      return pick(record.kbCode) ?? pick(record.externalCode);
    case "interbud":
      return pick(record.interbudId) ?? pick(record.externalCode) ?? pick(record.pozycja);
    case "sekocenbud":
      return pick(record.sekocenCode) ?? pick(record.externalCode);
    case "wgdom":
      return pick(record.workId);
    default:
      return pick(record.externalCode);
  }
}

function resolveOrigin(
  record: Record<string, unknown>,
  defaultOrigin?: MarketOriginId,
): MarketOriginId | null {
  const raw = record.origin;
  if (isMarketOriginId(raw)) return raw;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (isMarketOriginId(normalized)) return normalized;
  }
  return defaultOrigin ?? null;
}

function classifyPreviewStatus(
  workId: string | null,
  confidence: number,
  threshold: number,
  validationOk: boolean,
): MarketCsvPreviewStatus {
  if (!validationOk) return "rejected";
  if (!workId) return "unmatched";
  if (confidence < threshold) return "low_confidence";
  return "matched";
}

function bucketRow(report: MarketCsvPreviewReport, row: MarketCsvPreviewRow): void {
  switch (row.status) {
    case "matched":
      report.matched.push(row);
      break;
    case "low_confidence":
      report.lowConfidence.push(row);
      break;
    case "unmatched":
      report.unmatched.push(row);
      break;
    case "rejected":
    default:
      report.rejected.push(row);
      break;
  }
}

export interface MarketCsvPreviewInputRow {
  lineNumber?: number | null;
  values: Record<string, string>;
}

export function previewMarketCsvRows(
  rows: MarketCsvPreviewInputRow[],
  options: MarketCsvPreviewOptions = {},
): MarketCsvPreviewReport {
  const fallbackUpdatedAt = options.fallbackUpdatedAt ?? DEFAULT_FALLBACK_UPDATED_AT;
  const threshold = options.lowConfidenceThreshold ?? MARKET_MIN_CONFIDENCE_DEFAULT;
  const mappingStore = options.mappingStore;

  const report: MarketCsvPreviewReport = {
    mode: "preview",
    parse: { ok: true, delimiter: ",", headers: [], rows: [], rejected: [] },
    matched: [],
    lowConfidence: [],
    unmatched: [],
    rejected: [],
    summary: {
      totalInputRows: rows.length,
      parsedRows: rows.length,
      parseRejectedLines: 0,
      matched: 0,
      lowConfidence: 0,
      unmatched: 0,
      rejected: 0,
    },
  };

  rows.forEach((inputRow, rowIndex) => {
    const record = csvRowToAdapterRecord(inputRow.values);
    const origin = resolveOrigin(record, options.defaultOrigin);

    if (!origin) {
      bucketRow(report, {
        rowIndex,
        lineNumber: inputRow.lineNumber ?? null,
        origin: null,
        externalId: null,
        workId: null,
        confidence: 0,
        status: "rejected",
        regionCode: null,
        price: null,
        errors: ["Brak lub niepoprawny origin"],
        snapshot: null,
      });
      return;
    }

    const externalId = resolveCsvExternalId(origin, record);
    const workIndex = mappingStore
      ? buildMarketWorkMappingIndexForOrigin(mappingStore, origin)
      : undefined;

    const adapted = adaptMarketSourceRecord(origin, record, {
      fallbackUpdatedAt,
      workIndex,
    });

    let workId = adapted.workId;
    let dictHit = null;

    if (!workId && externalId && mappingStore) {
      dictHit = findMapping(mappingStore, origin, externalId);
      if (dictHit) {
        workId = dictHit.mapping.workId;
      }
    }

    const confidence =
      adapted.snapshot?.confidence
      ?? dictHit?.mapping.confidence
      ?? 0;

    const status = classifyPreviewStatus(
      workId,
      confidence,
      threshold,
      adapted.validation.ok,
    );

    bucketRow(report, {
      rowIndex,
      lineNumber: inputRow.lineNumber ?? null,
      origin,
      externalId,
      workId,
      confidence,
      status,
      regionCode: adapted.snapshot?.regionCode ?? null,
      price: adapted.snapshot?.price ?? null,
      errors: adapted.validation.ok ? [] : [...adapted.validation.errors],
      snapshot: adapted.snapshot,
    });
  });

  report.summary.matched = report.matched.length;
  report.summary.lowConfidence = report.lowConfidence.length;
  report.summary.unmatched = report.unmatched.length;
  report.summary.rejected = report.rejected.length;

  return report;
}

export function previewMarketCsvImport(
  csvText: string,
  options: MarketCsvPreviewOptions = {},
): MarketCsvPreviewReport {
  const parse = parseMarketCsv(csvText, options.parse);
  const preview = previewMarketCsvRows(
    parse.rows.map((row) => ({ lineNumber: row.lineNumber, values: row.values })),
    options,
  );

  const parseRejectedRows: MarketCsvPreviewRow[] = parse.rejected.map((line, idx) => ({
    rowIndex: parse.rows.length + idx,
    lineNumber: line.lineNumber,
    origin: options.defaultOrigin ?? null,
    externalId: null,
    workId: null,
    confidence: 0,
    status: "rejected" as const,
    regionCode: null,
    price: null,
    errors: [
      line.reason === "column_mismatch"
        ? "Niezgodna liczba kolumn"
        : line.reason === "no_headers"
          ? "Brak nagłówka CSV"
          : "Odrzucona linia CSV",
    ],
    snapshot: null,
  }));

  return {
    ...preview,
    parse,
    rejected: [...preview.rejected, ...parseRejectedRows],
    summary: {
      ...preview.summary,
      parseRejectedLines: parse.rejected.length,
      totalInputRows: parse.rows.length + parse.rejected.length,
      parsedRows: parse.rows.length,
      rejected: preview.rejected.length + parseRejectedRows.length,
    },
  };
}
