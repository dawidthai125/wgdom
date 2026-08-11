/**
 * REAL-SOURCE-LIVE-ADAPTERS-08 — selective DIY lookup types.
 * ONE materialKey query only · NEVER catalogue / category harvest.
 */

export type DiyShopProviderId = "leroy" | "castorama" | "obi";

export interface DiySelectiveLookupRequest {
  provider: DiyShopProviderId;
  /** Free-text product query (name / brand / model) — not a category path. */
  query: string;
  materialKey: string;
  sku?: string | null;
  ean?: string | null;
  /** Hard bound — default 1 page / 1 URL. */
  maxUrls?: 1;
}

export interface DiySelectiveRawPage {
  provider: DiyShopProviderId;
  requestUrl: string;
  finalUrl?: string | null;
  status: number;
  bodyText: string;
  fetchedAtIso: string;
}

export type DiySelectiveLookupResult =
  | { ok: true; page: DiySelectiveRawPage; httpFetchCount: number }
  | {
      ok: false;
      error: string;
      httpFetchCount: number;
      /** Soft miss — do not invent price. */
      priceGap?: boolean;
    };

export interface DiySelectiveLookupPort {
  lookup(req: DiySelectiveLookupRequest): Promise<DiySelectiveLookupResult>;
}

export interface DiyParsedOffer {
  provider: DiyShopProviderId;
  productName: string;
  priceGrossPln: number;
  currency: "PLN";
  priceType: "regular" | "promo" | "unknown";
  sellerKind: "direct_retailer" | "marketplace" | "unknown";
  sellerName: string | null;
  sku?: string | null;
  ean?: string | null;
  sourceUrl: string;
  /** Identity confidence — false ⇒ treat as PRICE_GAP (wrong product > missing). */
  identityMatched: boolean;
}
