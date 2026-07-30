/**
 * P3.1 — wiele źródeł cen rynkowych (typy + normalizacja, pure).
 */

import {
  isMarketRegionCode,
  type MarketRegionCode,
} from "@/lib/work-catalog/market-regions";

export const MARKET_ORIGIN_IDS = [
  "kb_pl",
  "interbud",
  "sekocenbud",
  "wgdom",
] as const;

export type MarketOriginId = (typeof MARKET_ORIGIN_IDS)[number];

export const MARKET_ORIGIN_LABELS_PL: Record<MarketOriginId, string> = {
  kb_pl: "KB.pl",
  interbud: "Interbud",
  sekocenbud: "Sekocenbud",
  wgdom: "WGDOM",
};

/**
 * MARKET-SYNC-01 P1 — origins DIY (Leroy / Castorama).
 * Dozwolone w `marketQuotes` · **poza** `MARKET_ORIGIN_IDS` → `enabledOrigins` silnika
 * średniej pozostaje default OFF (nie włączają się automatycznie do controlled_market).
 */
export const MARKET_DIY_ORIGIN_IDS = ["leroy", "castorama"] as const;

export type MarketDiyOriginId = (typeof MARKET_DIY_ORIGIN_IDS)[number];

export const MARKET_DIY_ORIGIN_LABELS_PL: Record<MarketDiyOriginId, string> = {
  leroy: "Leroy Merlin",
  castorama: "Castorama",
};

/**
 * Ukryty origin migracyjny (P3.0 `legacy_seed`) — NIE produktowy.
 * Poza `MARKET_ORIGIN_IDS` (więc poza domyślnym `enabledOrigins` silnika) i poza UI.
 * Nośnik migracji `marketAvgPln` → `marketQuotes` (v3→v4).
 */
export const MARKET_LEGACY_SEED_ORIGIN_ID = "legacy_seed" as const;

/** Wszystkie klucze origin dopuszczalne w `marketQuotes`: produktowe + legacy + DIY. */
export const MARKET_QUOTE_ORIGIN_IDS = [
  ...MARKET_ORIGIN_IDS,
  MARKET_LEGACY_SEED_ORIGIN_ID,
  ...MARKET_DIY_ORIGIN_IDS,
] as const;

export type MarketQuoteOriginId = (typeof MARKET_QUOTE_ORIGIN_IDS)[number];

/** Zakres geograficzny ceny w obrębie regionCode. */
export type MarketCoverage = "full" | "partial" | "indicative";

export const MARKET_COVERAGE_VALUES: readonly MarketCoverage[] = [
  "full",
  "partial",
  "indicative",
] as const;

export interface MarketSourceSnapshot {
  price: number;
  regionCode: MarketRegionCode;
  coverage: MarketCoverage;
  updatedAt: string;
  confidence: number;
  origin: MarketQuoteOriginId;
}

/** `origin` → `regionCode` → snapshot (P3.0B). Klucz obejmuje legacy_seed (migracja). */
export type WorkMarketQuotes = Partial<
  Record<MarketQuoteOriginId, Partial<Record<MarketRegionCode, MarketSourceSnapshot>>>
>;

export const MARKET_MIN_CONFIDENCE_DEFAULT = 0.5;

export function isMarketOriginId(value: unknown): value is MarketOriginId {
  return typeof value === "string" && (MARKET_ORIGIN_IDS as readonly string[]).includes(value);
}

export function isMarketDiyOriginId(value: unknown): value is MarketDiyOriginId {
  return typeof value === "string" && (MARKET_DIY_ORIGIN_IDS as readonly string[]).includes(value);
}

/** Origin produktowy LUB legacy_seed LUB DIY — dopuszczalny jako klucz `marketQuotes`. */
export function isMarketQuoteOriginId(value: unknown): value is MarketQuoteOriginId {
  return typeof value === "string" && (MARKET_QUOTE_ORIGIN_IDS as readonly string[]).includes(value);
}

export function isMarketCoverage(value: unknown): value is MarketCoverage {
  return typeof value === "string" && (MARKET_COVERAGE_VALUES as readonly string[]).includes(value);
}

export function roundMarketPricePln(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}

export function normalizeMarketCoverage(value: unknown): MarketCoverage {
  return isMarketCoverage(value) ? value : "full";
}

export function normalizeMarketSourceSnapshot(
  raw: unknown,
  fallbackUpdatedAt: string,
  fallbackOrigin?: MarketQuoteOriginId,
  fallbackRegion?: MarketRegionCode,
): MarketSourceSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as Partial<MarketSourceSnapshot>;

  const origin = isMarketQuoteOriginId(snap.origin)
    ? snap.origin
    : fallbackOrigin ?? null;
  const regionCode = isMarketRegionCode(snap.regionCode)
    ? snap.regionCode
    : fallbackRegion ?? null;

  if (!origin || !regionCode) return null;

  const price = Number(snap.price);
  const confidence = Number(snap.confidence);

  if (!Number.isFinite(price) || price <= 0) return null;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;

  const updatedAt =
    typeof snap.updatedAt === "string" && snap.updatedAt.trim()
      ? snap.updatedAt.trim()
      : fallbackUpdatedAt;

  return {
    price: roundMarketPricePln(price),
    regionCode,
    coverage: normalizeMarketCoverage(snap.coverage),
    updatedAt,
    confidence,
    origin,
  };
}

export function normalizeWorkMarketQuotes(
  raw: unknown,
  fallbackUpdatedAt: string,
): WorkMarketQuotes | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const input = raw as Record<string, unknown>;
  const out: WorkMarketQuotes = {};
  let hasAny = false;

  for (const origin of MARKET_QUOTE_ORIGIN_IDS) {
    const perRegion = input[origin];
    if (!perRegion || typeof perRegion !== "object") continue;

    const regionMap: Partial<Record<MarketRegionCode, MarketSourceSnapshot>> = {};
    for (const [regionKey, regionRaw] of Object.entries(perRegion as Record<string, unknown>)) {
      if (!isMarketRegionCode(regionKey)) continue;
      const snap = normalizeMarketSourceSnapshot(regionRaw, fallbackUpdatedAt, origin, regionKey);
      if (!snap) continue;
      regionMap[regionKey] = snap;
      hasAny = true;
    }

    if (Object.keys(regionMap).length > 0) {
      out[origin] = regionMap;
    }
  }

  return hasAny ? out : undefined;
}
