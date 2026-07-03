/**
 * P3.2A — parser CSV dla importu cen rynkowych (pure, bez zapisu).
 */

export type MarketCsvDelimiter = "," | ";";

export interface MarketCsvParseOptions {
  delimiter?: MarketCsvDelimiter;
  /** Domyślnie 1 — wiersz nagłówka. */
  headerRowIndex?: number;
  skipEmptyLines?: boolean;
}

export interface MarketCsvParseRejectedLine {
  lineNumber: number;
  raw: string;
  reason: "empty" | "column_mismatch" | "no_headers";
}

export interface MarketCsvParsedRow {
  lineNumber: number;
  values: Record<string, string>;
}

export interface MarketCsvParseResult {
  ok: boolean;
  delimiter: MarketCsvDelimiter;
  headers: string[];
  rows: MarketCsvParsedRow[];
  rejected: MarketCsvParseRejectedLine[];
}

const UTF8_BOM = "\uFEFF";

function stripBom(text: string): string {
  return text.startsWith(UTF8_BOM) ? text.slice(1) : text;
}

function splitCsvLines(text: string): string[] {
  const normalized = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.split("\n");
}

function detectDelimiter(headerLine: string): MarketCsvDelimiter {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

/** Parser jednej linii CSV z obsługą cudzysłowów i separatora dziesiętnego w polu. */
export function parseCsvLine(line: string, delimiter: MarketCsvDelimiter): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (inQuotes) {
      if (ch === "\"") {
        if (next === "\"") {
          current += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "\"") {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      fields.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  fields.push(current);
  return fields;
}

function normalizeHeaderKey(header: string): string {
  return header.trim().replace(/^\uFEFF/, "");
}

export function parseMarketCsv(
  text: string,
  options: MarketCsvParseOptions = {},
): MarketCsvParseResult {
  const skipEmptyLines = options.skipEmptyLines !== false;
  const headerRowIndex = options.headerRowIndex ?? 0;
  const lines = splitCsvLines(text);
  const rejected: MarketCsvParseRejectedLine[] = [];

  const nonEmptyLines: { lineNumber: number; raw: string }[] = [];
  lines.forEach((raw, idx) => {
    const lineNumber = idx + 1;
    if (!raw.trim()) {
      if (!skipEmptyLines) {
        rejected.push({ lineNumber, raw, reason: "empty" });
      }
      return;
    }
    nonEmptyLines.push({ lineNumber, raw });
  });

  if (nonEmptyLines.length === 0) {
    return {
      ok: false,
      delimiter: options.delimiter ?? ",",
      headers: [],
      rows: [],
      rejected: [{ lineNumber: 1, raw: "", reason: "no_headers" }],
    };
  }

  const headerEntry = nonEmptyLines[headerRowIndex];
  if (!headerEntry) {
    return {
      ok: false,
      delimiter: options.delimiter ?? ",",
      headers: [],
      rows: [],
      rejected: [{ lineNumber: 1, raw: "", reason: "no_headers" }],
    };
  }

  const delimiter = options.delimiter ?? detectDelimiter(headerEntry.raw);
  const headers = parseCsvLine(headerEntry.raw, delimiter).map(normalizeHeaderKey);

  if (headers.length === 0 || headers.every((h) => !h)) {
    return {
      ok: false,
      delimiter,
      headers: [],
      rows: [],
      rejected: [{ lineNumber: headerEntry.lineNumber, raw: headerEntry.raw, reason: "no_headers" }],
    };
  }

  const rows: MarketCsvParsedRow[] = [];
  const dataLines = nonEmptyLines.slice(headerRowIndex + 1);

  for (const { lineNumber, raw } of dataLines) {
    const fields = parseCsvLine(raw, delimiter);
    if (fields.length !== headers.length) {
      rejected.push({ lineNumber, raw, reason: "column_mismatch" });
      continue;
    }

    const values: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      values[header] = fields[idx]?.trim() ?? "";
    });
    rows.push({ lineNumber, values });
  }

  return {
    ok: rows.length > 0 || rejected.length === 0,
    delimiter,
    headers,
    rows,
    rejected,
  };
}
