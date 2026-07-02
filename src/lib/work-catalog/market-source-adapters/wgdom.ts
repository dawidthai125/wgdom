/**
 * P3.1A — adapter WGDOM (wewnętrzne sygnały rynkowe — przyszłość).
 */

import type {
  MarketSourceAdapter,
  MarketSourceAdapterMapWorkResult,
  MarketSourceAdapterNormalizeOptions,
  MarketSourceAdapterValidateResult,
} from "@/lib/work-catalog/market-source-adapter";
import {
  asAdapterRecord,
  buildSnapshotFromParts,
  mapMarketRegionLabelToCode,
  marketAdapterValidationOk,
  parseAdapterConfidence,
  parseAdapterPrice,
  parseAdapterUpdatedAt,
} from "@/lib/work-catalog/market-source-adapter";
import type { MarketRegionCode } from "@/lib/work-catalog/market-regions";
import type { MarketSourceSnapshot } from "@/lib/work-catalog/market-sources";
import { normalizeMarketCoverage } from "@/lib/work-catalog/market-sources";

export interface WgdomMarketRawRecord {
  workId: string;
  price: unknown;
  region?: unknown;
  regionCode?: unknown;
  coverage?: unknown;
  updatedAt?: unknown;
  confidence?: unknown;
  sampleCount?: number;
}

const ORIGIN = "wgdom" as const;
const DEFAULT_CONFIDENCE = 0.92;

function confidenceFromSampleCount(sampleCount: unknown, base: number): number {
  const n = Number(sampleCount);
  if (!Number.isFinite(n) || n <= 0) return base;
  if (n >= 5) return Math.min(1, base + 0.05);
  if (n === 1) return Math.max(0.5, base - 0.15);
  return base;
}

export const wgdomMarketSourceAdapter: MarketSourceAdapter<WgdomMarketRawRecord> = {
  origin: ORIGIN,

  validate(raw: unknown): MarketSourceAdapterValidateResult {
    const record = asAdapterRecord(raw) as WgdomMarketRawRecord | null;
    const errors: string[] = [];
    if (!record) return marketAdapterValidationOk(["Rekord musi być obiektem"]);
    if (!record.workId?.trim()) errors.push("Wymagany workId");
    if (parseAdapterPrice(record.price) == null) errors.push("Brak poprawnej ceny");
    if (!mapMarketRegionLabelToCode(record.regionCode ?? record.region ?? "wroclaw")) {
      errors.push("Brak rozpoznanego regionu");
    }
    return marketAdapterValidationOk(errors);
  },

  mapRegion(raw): MarketRegionCode | null {
    return mapMarketRegionLabelToCode(raw.regionCode ?? raw.region ?? "wroclaw");
  },

  mapWork(raw): MarketSourceAdapterMapWorkResult {
    const workId = raw.workId?.trim() ?? null;
    if (!workId) return { workId: null, confidence: 0 };
    const confidence = confidenceFromSampleCount(raw.sampleCount, DEFAULT_CONFIDENCE);
    return { workId, confidence };
  },

  normalize(raw: unknown, options: MarketSourceAdapterNormalizeOptions): MarketSourceSnapshot | null {
    const record = asAdapterRecord(raw) as WgdomMarketRawRecord | null;
    if (!record) return null;
    if (!this.validate(record).ok) return null;

    const price = parseAdapterPrice(record.price);
    const regionCode = this.mapRegion(record);
    if (price == null || !regionCode) return null;

    const work = this.mapWork(record);
    const confidence =
      parseAdapterConfidence(
        record.confidence,
        confidenceFromSampleCount(record.sampleCount, work.confidence),
      ) ?? work.confidence;

    return buildSnapshotFromParts({
      origin: ORIGIN,
      price,
      regionCode,
      coverage: normalizeMarketCoverage(record.coverage ?? "full"),
      updatedAt: parseAdapterUpdatedAt(record.updatedAt, options.fallbackUpdatedAt),
      confidence,
    });
  },
};
