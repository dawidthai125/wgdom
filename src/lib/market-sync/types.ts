/**
 * MARKET-SYNC-01 — modele staging (Feature-Data).
 * P0: Preview · P1: Accept + Publish · P2: PriceHistory (staging.priceHistory[]).
 */

export type ProviderId =
  | "leroy"
  | "castorama"
  | "obi"
  | "bricoman"
  | "psb"
  | "other";

export type ProviderQuoteStatus =
  | "imported"
  | "proposed"
  | "unmatched"
  | "conflict"
  | "rejected_row"
  | "accepted"
  | "rejected"
  | "deferred"
  | "published";

export type MatchMethod = "ean" | "provider_sku" | "mfr_name_unit" | "alias" | "manual";

export type MarketSyncSourceKind = "csv_export" | "manual";

export type MarketProductCategory =
  | "chemia"
  | "suche_zabudowy"
  | "instalacje"
  | "wykończenie"
  | "inne";

export interface MarketProduct {
  id: string;
  canonicalName: string;
  manufacturer: string | null;
  unit: string;
  category: MarketProductCategory | string | null;
  aliases: string[];
  ean: string[];
  /** P1 N:1 — 0 lub 1 workId do Publish. */
  linkedWorkIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatchCandidate {
  marketProductId: string;
  confidence: number;
  method: MatchMethod;
}

export interface ProviderQuote {
  id: string;
  provider: ProviderId;
  providerSku: string;
  ean: string | null;
  productName: string;
  unit: string;
  grossPrice: number;
  currency: string;
  sourceUrl: string | null;
  importedAt: string;
  status: ProviderQuoteStatus;
  syncRunId: string;
  marketProductId: string | null;
  matchConfidence: number | null;
  matchMethod: MatchMethod | null;
  matchCandidates: MatchCandidate[];
  unitRaw?: string;
  productNameFold?: string;
  manufacturer?: string | null;
  rejectReason?: string;
}

export interface SyncRun {
  id: string;
  provider: ProviderId | null;
  startedAt: string;
  actorAdminId: string | null;
  sourceKind: MarketSyncSourceKind;
  fileName?: string | null;
  rowCount?: number;
  rejectedCount?: number;
}

/** MARKET-SYNC-01 P2 — append-only ring (cap 24 / product×provider). */
export interface PriceHistoryEntry {
  id: string;
  marketProductId: string;
  providerId: ProviderId;
  providerSku: string;
  pricePln: number;
  at: string;
  sourceKind: MarketSyncSourceKind;
  syncRunId: string | null;
  quoteId: string;
}

export type PreviewBucketId =
  | "new_product"
  | "price_change"
  | "unmatched"
  | "conflict"
  | "proposed"
  | "rejected_row"
  | "unit_conflict"
  | "unchanged";

export interface MarketSyncStagingStore {
  version: 1;
  updatedAt: string;
  marketProducts: MarketProduct[];
  providerQuotes: ProviderQuote[];
  syncRuns: SyncRun[];
  /** P2 — Soft-add; brak w starych snapshotach = []. */
  priceHistory?: PriceHistoryEntry[];
}

export const MARKET_SYNC_STAGING_STORAGE_KEY = "kw-market-sync-01-staging";

export const PROVIDER_IDS: readonly ProviderId[] = [
  "leroy",
  "castorama",
  "obi",
  "bricoman",
  "psb",
  "other",
] as const;

export const EMPTY_MARKET_SYNC_STAGING: MarketSyncStagingStore = {
  version: 1,
  updatedAt: "",
  marketProducts: [],
  providerQuotes: [],
  syncRuns: [],
  priceHistory: [],
};
