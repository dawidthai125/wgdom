/**
 * P3.1A — adapter KB.pl (surowy rekord → MarketSourceSnapshot).
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

export interface KbPlMarketRawRecord {
  kbCode?: string;
  externalCode?: string;
  namePl?: string;
  price: unknown;
  region?: unknown;
  regionCode?: unknown;
  coverage?: unknown;
  updatedAt?: unknown;
  confidence?: unknown;
  workId?: string;
}

const ORIGIN = "kb_pl" as const;
const DEFAULT_CONFIDENCE = 0.85;
const NAME_ONLY_CONFIDENCE = 0.55;

function pickExternalCode(record: KbPlMarketRawRecord): string | null {
  const code = record.kbCode ?? record.externalCode;
  return typeof code === "string" && code.trim() ? code.trim() : null;
}

export const kbPlMarketSourceAdapter: MarketSourceAdapter<KbPlMarketRawRecord> = {
  origin: ORIGIN,

  validate(raw: unknown): MarketSourceAdapterValidateResult {
    const record = asAdapterRecord(raw) as KbPlMarketRawRecord | null;
    const errors: string[] = [];
    if (!record) return marketAdapterValidationOk(["Rekord musi być obiektem"]);

    if (parseAdapterPrice(record.price) == null) errors.push("Brak poprawnej ceny (price)");
    if (!mapMarketRegionLabelToCode(record.regionCode ?? record.region)) {
      errors.push("Brak rozpoznanego regionu (region / regionCode)");
    }
    if (!pickExternalCode(record) && !record.workId?.trim()) {
      errors.push("Wymagany kbCode, externalCode lub workId");
    }

    const conf = parseAdapterConfidence(record.confidence, DEFAULT_CONFIDENCE);
    if (record.confidence != null && record.confidence !== "" && conf == null) {
      errors.push("confidence poza zakresem 0..1");
    }

    return marketAdapterValidationOk(errors);
  },

  mapRegion(raw: KbPlMarketRawRecord): MarketRegionCode | null {
    return mapMarketRegionLabelToCode(raw.regionCode ?? raw.region);
  },

  mapWork(raw, workIndex): MarketSourceAdapterMapWorkResult {
    if (typeof raw.workId === "string" && raw.workId.trim()) {
      return { workId: raw.workId.trim(), confidence: DEFAULT_CONFIDENCE };
    }
    const mapped = resolveWorkIdFromIndex(pickExternalCode(raw), workIndex, DEFAULT_CONFIDENCE);
    if (mapped.workId) return mapped;
    if (raw.namePl?.trim()) {
      return { workId: null, confidence: NAME_ONLY_CONFIDENCE };
    }
    return { workId: null, confidence: 0 };
  },

  normalize(raw: unknown, options: MarketSourceAdapterNormalizeOptions): MarketSourceSnapshot | null {
    const record = asAdapterRecord(raw) as KbPlMarketRawRecord | null;
    if (!record) return null;
    const validation = this.validate(record);
    if (!validation.ok) return null;

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
