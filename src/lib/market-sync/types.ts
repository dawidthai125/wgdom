/**
 * MARKET-SYNC-01 P0 — modele staging (Feature-Data).
 * STOP: Preview only · bez Accept / publish / Quotes / Cloud CORE.
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
  | "rejected_row";

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
};
