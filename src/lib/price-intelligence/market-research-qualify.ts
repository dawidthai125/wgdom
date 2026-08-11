/**
 * Market research observation qualification — regular / direct-retailer only.
 * Pure helpers · ZERO HTTP · used by mock path + future Legal PASS adapters.
 */

export type MarketResearchPriceType = "regular" | "promo" | "unknown";

export type MarketResearchSellerKind = "direct_retailer" | "marketplace" | "unknown";

export interface QualifyingMarketObservationInput {
  materialKey: string;
  provider: "leroy" | "castorama" | "obi" | string;
  priceNet: number;
  currency?: string;
  priceType?: MarketResearchPriceType | null;
  sellerKind?: MarketResearchSellerKind | null;
  sellerName?: string | null;
  observedAt?: string | null;
  sourceUrl?: string | null;
  sku?: string | null;
}

export type QualifyMarketObservationResult =
  | { ok: true; observation: QualifyingMarketObservationInput & { priceType: "regular"; sellerKind: "direct_retailer" } }
  | {
      ok: false;
      reason:
        | "promo_excluded"
        | "marketplace_excluded"
        | "invalid_price"
        | "currency_not_pln"
        | "missing_timestamp"
        | "price_type_unknown"
        | "seller_unknown";
      messagePl: string;
    };

/**
 * Qualify one shop observation for Price Memory market reference.
 * Promo / marketplace / unknown → GAP (nie invent regular).
 */
export function qualifyMarketResearchObservation(
  input: QualifyingMarketObservationInput,
): QualifyMarketObservationResult {
  const price = Number(input.priceNet);
  if (!Number.isFinite(price) || !(price > 0)) {
    return { ok: false, reason: "invalid_price", messagePl: "Cena musi być > 0." };
  }
  const currency = String(input.currency || "PLN").trim().toUpperCase();
  if (currency !== "PLN") {
    return { ok: false, reason: "currency_not_pln", messagePl: `Waluta ${currency} ≠ PLN.` };
  }
  if (!String(input.observedAt || "").trim()) {
    return { ok: false, reason: "missing_timestamp", messagePl: "Brak timestamp — PRICE_GAP." };
  }
  const priceType = input.priceType ?? "unknown";
  if (priceType === "promo") {
    return {
      ok: false,
      reason: "promo_excluded",
      messagePl: "Cena promocyjna wykluczona z średniej referencyjnej.",
    };
  }
  if (priceType !== "regular") {
    return {
      ok: false,
      reason: "price_type_unknown",
      messagePl: "Brak wiarygodnej ceny regularnej — PRICE_GAP.",
    };
  }
  const sellerKind = input.sellerKind ?? "unknown";
  if (sellerKind === "marketplace") {
    return {
      ok: false,
      reason: "marketplace_excluded",
      messagePl: "Marketplace / third-party seller wykluczony — tylko direct retailer.",
    };
  }
  if (sellerKind !== "direct_retailer") {
    return {
      ok: false,
      reason: "seller_unknown",
      messagePl: "Brak potwierdzenia direct retailer — PRICE_GAP.",
    };
  }
  return {
    ok: true,
    observation: {
      ...input,
      priceNet: price,
      currency: "PLN",
      priceType: "regular",
      sellerKind: "direct_retailer",
    },
  };
}

export interface MarketRegularAverageResult {
  status: "ok" | "price_gap";
  averagePln: number | null;
  qualifyingCount: number;
  sourceCoverage: number;
  rejected: Array<{ reason: string; messagePl: string }>;
  /** True only when ≥2 qualifying sources contributed. */
  isMultiSourceAverage: boolean;
}

/**
 * Average of qualifying REGULAR + DIRECT observations only.
 * 1 source → observation saved, not pretended as 3-shop average.
 */
export function averageQualifyingRegularMarketPrices(
  inputs: readonly QualifyingMarketObservationInput[],
): MarketRegularAverageResult {
  const rejected: Array<{ reason: string; messagePl: string }> = [];
  const prices: number[] = [];
  for (const row of inputs) {
    const q = qualifyMarketResearchObservation(row);
    if (!q.ok) {
      rejected.push({ reason: q.reason, messagePl: q.messagePl });
      continue;
    }
    prices.push(q.observation.priceNet);
  }
  if (prices.length === 0) {
    return {
      status: "price_gap",
      averagePln: null,
      qualifyingCount: 0,
      sourceCoverage: 0,
      rejected,
      isMultiSourceAverage: false,
    };
  }
  const sum = prices.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / prices.length) * 100) / 100;
  return {
    status: "ok",
    averagePln: avg,
    qualifyingCount: prices.length,
    sourceCoverage: prices.length,
    rejected,
    isMultiSourceAverage: prices.length >= 2,
  };
}
