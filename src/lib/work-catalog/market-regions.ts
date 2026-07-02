/**
 * P3.1 — regiony rynku i hierarchia fallback (pure).
 * Priorytet produktowy: Wrocław → okolice → Dolny Śląsk → Polska.
 */

export const MARKET_REGION_CODES = [
  "wroclaw",
  "powiat_wroclawski",
  "dolnyslask",
  "polska",
] as const;

export type MarketRegionCode = (typeof MARKET_REGION_CODES)[number];

export const MARKET_REGION_LABELS_PL: Record<MarketRegionCode, string> = {
  wroclaw: "Wrocław",
  powiat_wroclawski: "Powiat wrocławski",
  dolnyslask: "Dolny Śląsk",
  polska: "Polska",
};

/** Kolejność od najbardziej lokalnej (P3.0B). */
export const MARKET_REGION_HIERARCHY_WROCLAW: readonly MarketRegionCode[] = [
  "wroclaw",
  "powiat_wroclawski",
  "dolnyslask",
  "polska",
] as const;

export const MARKET_REGION_HIERARCHY_DOLNOSLASK: readonly MarketRegionCode[] = [
  "dolnyslask",
  "polska",
] as const;

export const MARKET_REGION_HIERARCHY_POWIAT: readonly MarketRegionCode[] = [
  "powiat_wroclawski",
  "dolnyslask",
  "polska",
] as const;

export const MARKET_REGION_HIERARCHY_POLSKA: readonly MarketRegionCode[] = ["polska"] as const;

export function isMarketRegionCode(value: unknown): value is MarketRegionCode {
  return typeof value === "string" && (MARKET_REGION_CODES as readonly string[]).includes(value);
}

export function marketRegionLabelPl(code: MarketRegionCode): string {
  return MARKET_REGION_LABELS_PL[code];
}

/** Łańcuch fallback od punktu startowego (P3.0B). */
export function marketRegionFallbackChain(start: MarketRegionCode): readonly MarketRegionCode[] {
  switch (start) {
    case "wroclaw":
      return MARKET_REGION_HIERARCHY_WROCLAW;
    case "powiat_wroclawski":
      return MARKET_REGION_HIERARCHY_POWIAT;
    case "dolnyslask":
      return MARKET_REGION_HIERARCHY_DOLNOSLASK;
    case "polska":
      return MARKET_REGION_HIERARCHY_POLSKA;
    default:
      return MARKET_REGION_HIERARCHY_WROCLAW;
  }
}

export const DEFAULT_MARKET_START_REGION: MarketRegionCode = "wroclaw";
