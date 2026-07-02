/**
 * P3.1A — interfejs adapterów źródeł rynku (pure).
 * Konwersja surowych rekordów dostawcy → MarketSourceSnapshot (bez CSV/API/UI).
 */

import type { MarketRegionCode } from "@/lib/work-catalog/market-regions";
import { isMarketRegionCode } from "@/lib/work-catalog/market-regions";
import {
  normalizeMarketSourceSnapshot,
  roundMarketPricePln,
  type MarketCoverage,
  type MarketOriginId,
  type MarketSourceSnapshot,
} from "@/lib/work-catalog/market-sources";

export interface MarketSourceAdapterValidateResult {
  ok: boolean;
  errors: string[];
}

export interface MarketSourceAdapterMapWorkResult {
  workId: string | null;
  confidence: number;
}

/** Indeks mapowania kodów zewnętrznych → workId katalogu (przyszły ingest). */
export interface MarketWorkMappingIndex {
  byExternalCode: Readonly<Record<string, { workId: string; confidence?: number }>>;
}

export interface MarketSourceAdapterNormalizeOptions {
  fallbackUpdatedAt: string;
  workIndex?: MarketWorkMappingIndex;
}

export interface AdaptMarketRecordResult {
  origin: MarketOriginId;
  snapshot: MarketSourceSnapshot | null;
  workId: string | null;
  validation: MarketSourceAdapterValidateResult;
}

export interface MarketSourceAdapter<TRecord = Record<string, unknown>> {
  readonly origin: MarketOriginId;
  validate(raw: unknown): MarketSourceAdapterValidateResult;
  mapRegion(raw: TRecord): MarketRegionCode | null;
  mapWork(raw: TRecord, workIndex?: MarketWorkMappingIndex): MarketSourceAdapterMapWorkResult;
  normalize(raw: unknown, options: MarketSourceAdapterNormalizeOptions): MarketSourceSnapshot | null;
}

export function marketAdapterValidationOk(
  errors: string[],
): MarketSourceAdapterValidateResult {
  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}

export function asAdapterRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

const REGION_LABEL_ALIASES: Readonly<Record<string, MarketRegionCode>> = {
  wroclaw: "wroclaw",
  wrocław: "wroclaw",
  "miasto wrocław": "wroclaw",
  powiat_wroclawski: "powiat_wroclawski",
  "powiat wrocławski": "powiat_wroclawski",
  "powiat wroclawski": "powiat_wroclawski",
  okolice_wroclawia: "powiat_wroclawski",
  dolnyslask: "dolnyslask",
  "dolny śląsk": "dolnyslask",
  "dolnośląskie": "dolnyslask",
  dolnoslaskie: "dolnyslask",
  polska: "polska",
  kraj: "polska",
  poland: "polska",
};

/** Wspólne mapowanie etykiet PL / kodów → MarketRegionCode. */
export function mapMarketRegionLabelToCode(value: unknown): MarketRegionCode | null {
  if (isMarketRegionCode(value)) return value;
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  if (!key) return null;
  return REGION_LABEL_ALIASES[key] ?? null;
}

export function parseAdapterPrice(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

export function parseAdapterConfidence(
  value: unknown,
  fallback: number,
): number | null {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return n;
}

export function parseAdapterUpdatedAt(
  value: unknown,
  fallbackUpdatedAt: string,
): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallbackUpdatedAt;
}

export function resolveWorkIdFromIndex(
  externalCode: string | null | undefined,
  workIndex: MarketWorkMappingIndex | undefined,
  defaultConfidence: number,
): MarketSourceAdapterMapWorkResult {
  const code = externalCode?.trim();
  if (!code) return { workId: null, confidence: 0 };
  const hit = workIndex?.byExternalCode[code];
  if (!hit?.workId) return { workId: null, confidence: 0 };
  return {
    workId: hit.workId,
    confidence: hit.confidence ?? defaultConfidence,
  };
}

export function buildSnapshotFromParts(input: {
  origin: MarketOriginId;
  price: number;
  regionCode: MarketRegionCode;
  coverage: MarketCoverage;
  updatedAt: string;
  confidence: number;
}): MarketSourceSnapshot | null {
  return normalizeMarketSourceSnapshot(
    {
      price: roundMarketPricePln(input.price),
      regionCode: input.regionCode,
      coverage: input.coverage,
      updatedAt: input.updatedAt,
      confidence: input.confidence,
      origin: input.origin,
    },
    input.updatedAt,
    input.origin,
    input.regionCode,
  );
}
