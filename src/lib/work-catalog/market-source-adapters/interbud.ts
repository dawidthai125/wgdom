/**
 * P3.1A — adapter Interbud.
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
  resolveWorkIdFromIndex,
} from "@/lib/work-catalog/market-source-adapter";
import type { MarketRegionCode } from "@/lib/work-catalog/market-regions";
import type { MarketSourceSnapshot } from "@/lib/work-catalog/market-sources";
import { normalizeMarketCoverage } from "@/lib/work-catalog/market-sources";

export interface InterbudMarketRawRecord {
  interbudId?: string;
  externalCode?: string;
  pozycja?: string;
  price: unknown;
  region?: unknown;
  regionCode?: unknown;
  coverage?: unknown;
  updatedAt?: unknown;
  confidence?: unknown;
  workId?: string;
}

const ORIGIN = "interbud" as const;
const DEFAULT_CONFIDENCE = 0.8;

function pickExternalCode(record: InterbudMarketRawRecord): string | null {
  const code = record.interbudId ?? record.externalCode ?? record.pozycja;
  return typeof code === "string" && code.trim() ? code.trim() : null;
}

export const interbudMarketSourceAdapter: MarketSourceAdapter<InterbudMarketRawRecord> = {
  origin: ORIGIN,

  validate(raw: unknown): MarketSourceAdapterValidateResult {
    const record = asAdapterRecord(raw) as InterbudMarketRawRecord | null;
    const errors: string[] = [];
    if (!record) return marketAdapterValidationOk(["Rekord musi być obiektem"]);

    if (parseAdapterPrice(record.price) == null) errors.push("Brak poprawnej ceny (price)");
    if (!mapMarketRegionLabelToCode(record.regionCode ?? record.region)) {
      errors.push("Brak rozpoznanego regionu");
    }
    if (!pickExternalCode(record) && !record.workId?.trim()) {
      errors.push("Wymagany interbudId, externalCode, pozycja lub workId");
    }

    return marketAdapterValidationOk(errors);
  },

  mapRegion(raw): MarketRegionCode | null {
    return mapMarketRegionLabelToCode(raw.regionCode ?? raw.region);
  },

  mapWork(raw, workIndex): MarketSourceAdapterMapWorkResult {
    if (typeof raw.workId === "string" && raw.workId.trim()) {
      return { workId: raw.workId.trim(), confidence: DEFAULT_CONFIDENCE };
    }
    return resolveWorkIdFromIndex(pickExternalCode(raw), workIndex, DEFAULT_CONFIDENCE);
  },

  normalize(raw: unknown, options: MarketSourceAdapterNormalizeOptions): MarketSourceSnapshot | null {
    const record = asAdapterRecord(raw) as InterbudMarketRawRecord | null;
    if (!record) return null;
    if (!this.validate(record).ok) return null;

    const price = parseAdapterPrice(record.price);
    const regionCode = this.mapRegion(record);
    if (price == null || !regionCode) return null;

    const work = this.mapWork(record, options.workIndex);
    const confidence =
      parseAdapterConfidence(record.confidence, work.confidence || DEFAULT_CONFIDENCE)
      ?? DEFAULT_CONFIDENCE;

    return buildSnapshotFromParts({
      origin: ORIGIN,
      price,
      regionCode,
      coverage: normalizeMarketCoverage(record.coverage),
      updatedAt: parseAdapterUpdatedAt(record.updatedAt, options.fallbackUpdatedAt),
      confidence,
    });
  },
};
