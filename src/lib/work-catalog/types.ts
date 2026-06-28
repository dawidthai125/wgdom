/**
 * Biblioteka Robót i Cennik v3.0 — model domenowy (schema v3).
 * SSOT produktowy: Robota · Pakiet Robót · Biblioteka (≠ moduł Roboty / kw-jobs).
 */

import type {
  WgdomCostCategoryId,
  WgdomCostRegion,
  WgdomCostUnit,
} from "@/lib/wgdom-cost-catalog";
import type { TradeId } from "@/lib/work-catalog/trades";

export const WORK_CATALOG_SCHEMA_VERSION = 3 as const;
export const WORK_BUNDLE_SCHEMA_VERSION = 3 as const;

export type WorkCatalogSchemaVersion = typeof WORK_CATALOG_SCHEMA_VERSION;
export type WorkBundleSchemaVersion = typeof WORK_BUNDLE_SCHEMA_VERSION;

export type WorkCatalogSource = "seed" | "custom" | "copied";
export type WorkBundleSource = "seed" | "custom";

/** Status aktualności ceny firmy (wyliczany — patrz freshness.ts w P1.2). */
export type WorkFreshnessStatus = "ok" | "stale" | "missing";

/** Ukryty podział ceny firmy na materiał / robociznę dla adaptera legacy. */
export interface WorkCostSplit {
  materialRatio: number;
  laborRatio: number;
}

/** Pojedyncza pozycja Biblioteki — „Robota” w języku produktu. */
export interface CatalogWork {
  id: string;
  tradeId: TradeId;
  namePl: string;
  unit: WgdomCostUnit;
  companyPricePln: number;
  marketAvgPln?: number;
  marketMinPln?: number;
  marketMaxPln?: number;
  suggestedPricePln?: number;
  updatedAt: string;
  freshnessStatus: WorkFreshnessStatus;
  descriptionPl?: string;
  keywords: string[];
  active: boolean;
  favorite: boolean;
  usageCount: number;
  lastUsedAt?: string;
  source: WorkCatalogSource;
  /** Mapowanie na silnik legacy (wgdom-catalog-cost-engine) — ukryte w UI. */
  legacyCategoryId?: WgdomCostCategoryId;
  costSplit?: WorkCostSplit;
}

export interface WorkCatalogRegionSlice {
  region: WgdomCostRegion;
  works: CatalogWork[];
  updatedAt: string;
}

/**
 * Persystencja Biblioteki (`kw-wgdom-work-catalog`).
 * `catalogs` — osobny zestaw robót per region (zgodne z legacy WgdomCostCatalogStore).
 */
export interface WorkCatalogStore {
  schemaVersion: WorkCatalogSchemaVersion;
  activeRegion: WgdomCostRegion;
  catalogs: Record<WgdomCostRegion, WorkCatalogRegionSlice>;
  tradesOrder?: TradeId[];
  updatedAt: string;
  migratedFromLegacyAt?: string;
  seedManifestVersion?: string;
}

export interface WorkBundleStep {
  order: number;
  workId: string;
  quantityDefault?: number;
  notePl?: string;
}

/** Pakiet Robót — szablon wyceny/oferty (nie tworzy rekordu w module Roboty). */
export interface WorkBundle {
  id: string;
  namePl: string;
  descriptionPl?: string;
  primaryTradeId: TradeId;
  steps: WorkBundleStep[];
  estimatedDurationDays?: number;
  active: boolean;
  favorite: boolean;
  usageCount: number;
  updatedAt: string;
  source: WorkBundleSource;
}

/** Persystencja pakietów (`kw-wgdom-work-bundles`). */
export interface WorkBundleStore {
  schemaVersion: WorkBundleSchemaVersion;
  bundles: WorkBundle[];
  updatedAt: string;
}
