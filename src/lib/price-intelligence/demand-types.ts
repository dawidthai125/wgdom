/**
 * PRICE-INTELLIGENCE-01 P3.2 — Demand Queue types (pure).
 * Rejestruje brak ceny — NIE pobiera cen, NIE invent price.
 */

export const PRICE_DEMAND_STORAGE_KEY = "kw-price-intelligence-demand";
export const PRICE_DEMAND_SCHEMA_VERSION = 1 as const;
export const PRICE_DEMAND_ENTRIES_CAP = 500;
export const PRICE_DEMAND_TENDER_IDS_CAP = 24;

export type PriceDemandMissingLayer =
  | "PURCHASE_MISSING"
  | "MARKET_QUOTE_MISSING"
  | "BOTH_MISSING";

export type PriceDemandStatus = "MISSING" | "QUEUED" | "RESOLVED";

export type PriceDemandPriority = "LOW" | "MEDIUM" | "HIGH";

export interface PriceDemandRecord {
  /** Stable identity: materialKey|catalogWorkId|region|missingLayer */
  demandId: string;
  materialKey: string;
  catalogWorkId: string | null;
  normalizedName: string;
  unit: string;
  region: string;
  missingLayer: PriceDemandMissingLayer;
  status: PriceDemandStatus;
  priority: PriceDemandPriority;
  occurrenceCount: number;
  tenderIds: string[];
  firstRequestedAt: string;
  lastRequestedAt: string;
  reason: string;
}

export interface PriceDemandStore {
  schemaVersion: typeof PRICE_DEMAND_SCHEMA_VERSION;
  updatedAt: string;
  demands: PriceDemandRecord[];
}

export interface PriceDemandCandidate {
  materialKey: string;
  catalogWorkId: string | null;
  namePl: string;
  unit: string;
  region: string;
  missingLayer: PriceDemandMissingLayer;
  tenderId: string | null;
  requestedAt: string;
  reason: string;
}
