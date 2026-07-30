/**
 * MARKET-SYNC-01 P0 — import CSV → ProviderQuote staging (pure).
 */

import {
  foldPl,
  normalizeCurrency,
  normalizeEanDigits,
  normalizeUnit,
  parseGrossPrice,
  parseProviderId,
} from "@/lib/market-sync/normalize";
import type {
  ProviderId,
  ProviderQuote,
  SyncRun,
} from "@/lib/market-sync/types";
import { parseMarketCsv } from "@/lib/work-catalog/market-csv-parser";

export interface ImportCsvOptions {
  actorAdminId?: string | null;
  fileName?: string | null;
  defaultProvider?: ProviderId;
  nowIso?: string;
  newId?: () => string;
}

export interface ImportCsvResult {
  syncRun: SyncRun;
  quotes: ProviderQuote[];
  parseRejected: { lineNumber: number; reason: string }[];
}

const HEADER_ALIASES: Record<string, string> = {
  provider: "provider",
  sklep: "provider",
  providersku: "providerSku",
  sku: "providerSku",
  kod: "providerSku",
  ean: "ean",
  gtin: "ean",
  productname: "productName",
  nazwa: "productName",
  name: "productName",
  manufacturer: "manufacturer",
  producent: "manufacturer",
  unit: "unit",
  jm: "unit",
  jednostka: "unit",
  grossprice: "grossPrice",
  price: "grossPrice",
  cena: "grossPrice",
  cenabrutto: "grossPrice",
  currency: "currency",
  waluta: "currency",
  sourceurl: "sourceUrl",
  url: "sourceUrl",
};

function mapHeaders(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    const key = foldPl(h).replace(/[^a-z0-9]/g, "");
    const canon = HEADER_ALIASES[key];
    if (canon) map[h] = canon;
  }
  return map;
}

function cell(
  values: Record<string, string>,
  headerMap: Record<string, string>,
  field: string,
): string {
  for (const [rawH, canon] of Object.entries(headerMap)) {
    if (canon === field) return values[rawH] ?? "";
  }
  return "";
}

export function importProviderQuotesFromCsv(
  csvText: string,
  options: ImportCsvOptions = {},
): ImportCsvResult {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const newId = options.newId ?? (() => crypto.randomUUID());
  const syncRunId = `sr-${newId()}`;
  const parsed = parseMarketCsv(csvText);
  const headerMap = mapHeaders(parsed.headers);
  const quotes: ProviderQuote[] = [];
  const parseRejected = parsed.rejected.map((r) => ({
    lineNumber: r.lineNumber,
    reason: r.reason,
  }));

  let dominantProvider: ProviderId | null = options.defaultProvider ?? null;

  for (const row of parsed.rows) {
    const productName = cell(row.values, headerMap, "productName").trim();
    const providerRaw = cell(row.values, headerMap, "provider");
    const provider =
      parseProviderId(providerRaw) ?? options.defaultProvider ?? "other";
    if (!dominantProvider) dominantProvider = provider;

    const providerSku = cell(row.values, headerMap, "providerSku").trim();
    const ean = normalizeEanDigits(cell(row.values, headerMap, "ean"));
    const manufacturerRaw = cell(row.values, headerMap, "manufacturer").trim();
    const unitRes = normalizeUnit(cell(row.values, headerMap, "unit"));
    const price = parseGrossPrice(cell(row.values, headerMap, "grossPrice"));
    const currency = normalizeCurrency(cell(row.values, headerMap, "currency"));
    const sourceUrl = cell(row.values, headerMap, "sourceUrl").trim() || null;

    const base = {
      id: `pq-${newId()}`,
      provider,
      providerSku,
      ean,
      productName: productName || "(brak nazwy)",
      importedAt: nowIso,
      syncRunId,
      marketProductId: null as string | null,
      matchConfidence: null as number | null,
      matchMethod: null,
      matchCandidates: [] as ProviderQuote["matchCandidates"],
      manufacturer: manufacturerRaw || null,
      productNameFold: foldPl(productName),
      sourceUrl,
      currency,
    };

    if (!productName) {
      quotes.push({
        ...base,
        unit: unitRes.ok ? unitRes.unit : "",
        unitRaw: unitRes.unitRaw,
        grossPrice: price ?? 0,
        status: "rejected_row",
        rejectReason: "missing_product_name",
      });
      continue;
    }
    if (price == null) {
      quotes.push({
        ...base,
        unit: unitRes.ok ? unitRes.unit : "",
        unitRaw: unitRes.unitRaw,
        grossPrice: 0,
        status: "rejected_row",
        rejectReason: "missing_price",
      });
      continue;
    }
    if (!ean && !providerSku) {
      quotes.push({
        ...base,
        unit: unitRes.ok ? unitRes.unit : "",
        unitRaw: unitRes.unitRaw,
        grossPrice: price,
        status: "rejected_row",
        rejectReason: "missing_ean_and_sku",
      });
      continue;
    }
    if (currency !== "PLN") {
      quotes.push({
        ...base,
        unit: unitRes.ok ? unitRes.unit : "",
        unitRaw: unitRes.unitRaw,
        grossPrice: price,
        status: "rejected_row",
        rejectReason: "currency_not_pln",
      });
      continue;
    }
    if (!unitRes.ok) {
      quotes.push({
        ...base,
        unit: "",
        unitRaw: unitRes.unitRaw,
        grossPrice: price,
        status: "rejected_row",
        rejectReason: "unknown_unit",
      });
      continue;
    }

    quotes.push({
      ...base,
      unit: unitRes.unit,
      unitRaw: unitRes.unitRaw,
      grossPrice: price,
      status: "imported",
    });
  }

  const syncRun: SyncRun = {
    id: syncRunId,
    provider: dominantProvider,
    startedAt: nowIso,
    actorAdminId: options.actorAdminId ?? null,
    sourceKind: "csv_export",
    fileName: options.fileName ?? null,
    rowCount: quotes.length,
    rejectedCount: quotes.filter((q) => q.status === "rejected_row").length,
  };

  return { syncRun, quotes, parseRejected };
}
