/**
 * P3.1A — rejestr adapterów źródeł rynku.
 */

import type {
  AdaptMarketRecordResult,
  MarketSourceAdapter,
  MarketSourceAdapterNormalizeOptions,
} from "@/lib/work-catalog/market-source-adapter";
import { asAdapterRecord } from "@/lib/work-catalog/market-source-adapter";
import { interbudMarketSourceAdapter } from "@/lib/work-catalog/market-source-adapters/interbud";
import { kbPlMarketSourceAdapter } from "@/lib/work-catalog/market-source-adapters/kb-pl";
import { sekocenbudMarketSourceAdapter } from "@/lib/work-catalog/market-source-adapters/sekocenbud";
import { wgdomMarketSourceAdapter } from "@/lib/work-catalog/market-source-adapters/wgdom";
import type { MarketOriginId } from "@/lib/work-catalog/market-sources";
import { isMarketOriginId } from "@/lib/work-catalog/market-sources";

export { interbudMarketSourceAdapter } from "@/lib/work-catalog/market-source-adapters/interbud";
export { kbPlMarketSourceAdapter } from "@/lib/work-catalog/market-source-adapters/kb-pl";
export { sekocenbudMarketSourceAdapter } from "@/lib/work-catalog/market-source-adapters/sekocenbud";
export { wgdomMarketSourceAdapter } from "@/lib/work-catalog/market-source-adapters/wgdom";

export type { KbPlMarketRawRecord } from "@/lib/work-catalog/market-source-adapters/kb-pl";
export type { InterbudMarketRawRecord } from "@/lib/work-catalog/market-source-adapters/interbud";
export type { SekocenbudMarketRawRecord } from "@/lib/work-catalog/market-source-adapters/sekocenbud";
export type { WgdomMarketRawRecord } from "@/lib/work-catalog/market-source-adapters/wgdom";

export const MARKET_SOURCE_ADAPTERS: Readonly<Record<MarketOriginId, MarketSourceAdapter>> = {
  kb_pl: kbPlMarketSourceAdapter,
  interbud: interbudMarketSourceAdapter,
  sekocenbud: sekocenbudMarketSourceAdapter,
  wgdom: wgdomMarketSourceAdapter,
};

export function getMarketSourceAdapter(origin: MarketOriginId): MarketSourceAdapter {
  return MARKET_SOURCE_ADAPTERS[origin];
}

export function isKnownMarketSourceAdapter(origin: unknown): origin is MarketOriginId {
  return isMarketOriginId(origin) && origin in MARKET_SOURCE_ADAPTERS;
}

export function adaptMarketSourceRecord(
  origin: MarketOriginId,
  raw: unknown,
  options: MarketSourceAdapterNormalizeOptions,
): AdaptMarketRecordResult {
  const adapter = getMarketSourceAdapter(origin);
  const validation = adapter.validate(raw);
  const record = asAdapterRecord(raw);
  const work = record ? adapter.mapWork(record, options.workIndex) : { workId: null, confidence: 0 };
  const snapshot = validation.ok ? adapter.normalize(raw, options) : null;

  return {
    origin,
    snapshot,
    workId: work.workId,
    validation,
  };
}

export type { AdaptMarketRecordResult };
