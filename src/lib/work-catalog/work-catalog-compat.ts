/**
 * Biblioteka Robót i Cennik v3.0 — warstwa backward compatibility (P1.10).
 * Pure · deterministyczna · read-only — bez migracji, persist, zapisu.
 */

import {
  defaultWgdomCostCatalog,
  type WgdomCostCatalog,
  type WgdomCostCatalogStore,
  type WgdomCostRegion,
} from "@/lib/wgdom-cost-catalog";
import { WORK_CATALOG_SCHEMA_VERSION, type WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  buildLegacyCostCatalogFromWorkStore,
  type BuildLegacyCostCatalogOptions,
} from "@/lib/work-catalog/work-catalog-engine-adapter";

export type CatalogVersion = "legacy" | "work" | "unknown";

export type LegacyCatalogInput = WgdomCostCatalogStore | WgdomCostCatalog;

export interface ResolveCatalogCompatOptions {
  region?: WgdomCostRegion;
  referenceHourlyPln?: number;
  updatedAtIso?: string;
}

export interface CatalogForUiResolution {
  version: Exclude<CatalogVersion, "unknown">;
  activeRegion: WgdomCostRegion;
  /** Store legacy (schema v1) — gdy wejście było `WgdomCostCatalogStore`. */
  legacyStore: WgdomCostCatalogStore | null;
  /** Pojedynczy katalog legacy — gdy wejście było `WgdomCostCatalog`. */
  legacyCatalog: WgdomCostCatalog | null;
  /** Store v3 — gdy wejście było `WorkCatalogStore`. */
  workStore: WorkCatalogStore | null;
}

function normalizeRegion(value: unknown, fallback: WgdomCostRegion): WgdomCostRegion {
  return value === "dolnyslask" ? "dolnyslask" : fallback;
}

function isLegacyCostCatalogStore(value: unknown): value is WgdomCostCatalogStore {
  if (!value || typeof value !== "object") return false;
  const store = value as WgdomCostCatalogStore;
  if (store.schemaVersion !== 1) return false;
  if (!store.catalogs || typeof store.catalogs !== "object") return false;
  return (
    typeof store.catalogs.wroclaw === "object" &&
    store.catalogs.wroclaw != null &&
    typeof store.catalogs.dolnyslask === "object" &&
    store.catalogs.dolnyslask != null
  );
}

function isLegacyCostCatalogSingle(value: unknown): value is WgdomCostCatalog {
  if (!value || typeof value !== "object") return false;
  const catalog = value as WgdomCostCatalog & { catalogs?: unknown; activeRegion?: unknown };
  if (catalog.schemaVersion !== 1) return false;
  if (catalog.catalogs != null && typeof catalog.catalogs === "object") return false;
  if (catalog.activeRegion != null) return false;
  return typeof catalog.region === "string" && Array.isArray(catalog.categories);
}

function isWorkCatalogStore(value: unknown): value is WorkCatalogStore {
  if (!value || typeof value !== "object") return false;
  const store = value as WorkCatalogStore;
  return (
    store.schemaVersion === WORK_CATALOG_SCHEMA_VERSION &&
    typeof store.catalogs === "object" &&
    store.catalogs != null &&
    typeof store.catalogs.wroclaw === "object" &&
    store.catalogs.wroclaw != null &&
    typeof store.catalogs.dolnyslask === "object" &&
    store.catalogs.dolnyslask != null
  );
}

function resolveLegacyCatalogFromStore(
  store: WgdomCostCatalogStore,
  region: WgdomCostRegion,
): WgdomCostCatalog {
  return store.catalogs[region] ?? defaultWgdomCostCatalog(region);
}

function toBuildLegacyOptions(options: ResolveCatalogCompatOptions): BuildLegacyCostCatalogOptions {
  return {
    referenceHourlyPln: options.referenceHourlyPln,
    updatedAtIso: options.updatedAtIso,
  };
}

/** `WgdomCostCatalogStore` lub pojedynczy `WgdomCostCatalog` (schema v1). */
export function isLegacyCatalog(value: unknown): value is LegacyCatalogInput {
  return isLegacyCostCatalogStore(value) || isLegacyCostCatalogSingle(value);
}

/** `WorkCatalogStore` (schema v3). */
export function isWorkCatalog(value: unknown): value is WorkCatalogStore {
  return isWorkCatalogStore(value);
}

export function resolveCatalogVersion(value: unknown): CatalogVersion {
  if (isWorkCatalog(value)) return "work";
  if (isLegacyCatalog(value)) return "legacy";
  return "unknown";
}

/**
 * Zwraca `WgdomCostCatalog` dla silnika `wgdom-catalog-cost-engine`.
 * Legacy — pass-through; Work v3 — adapter (bez mutacji wejścia).
 */
export function resolveCatalogForEngine(
  value: unknown,
  options: ResolveCatalogCompatOptions = {},
): WgdomCostCatalog | null {
  if (isLegacyCostCatalogStore(value)) {
    const region = normalizeRegion(options.region, value.activeRegion);
    return resolveLegacyCatalogFromStore(value, region);
  }

  if (isLegacyCostCatalogSingle(value)) {
    const region = normalizeRegion(options.region, value.region);
    if (region !== value.region) return null;
    return value;
  }

  if (isWorkCatalogStore(value)) {
    const region = normalizeRegion(options.region, value.activeRegion);
    return buildLegacyCostCatalogFromWorkStore(value, region, toBuildLegacyOptions(options));
  }

  return null;
}

/**
 * Rozpoznaje wersję katalogu i zwraca referencje do store bez modyfikacji danych.
 * UI / cutover wybierają gałąź na podstawie `version`.
 */
export function resolveCatalogForUI(
  value: unknown,
  options: ResolveCatalogCompatOptions = {},
): CatalogForUiResolution | null {
  if (isWorkCatalogStore(value)) {
    const activeRegion = normalizeRegion(options.region, value.activeRegion);
    return {
      version: "work",
      activeRegion,
      legacyStore: null,
      legacyCatalog: null,
      workStore: value,
    };
  }

  if (isLegacyCostCatalogStore(value)) {
    const activeRegion = normalizeRegion(options.region, value.activeRegion);
    return {
      version: "legacy",
      activeRegion,
      legacyStore: value,
      legacyCatalog: resolveLegacyCatalogFromStore(value, activeRegion),
      workStore: null,
    };
  }

  if (isLegacyCostCatalogSingle(value)) {
    const activeRegion = normalizeRegion(options.region, value.region);
    return {
      version: "legacy",
      activeRegion,
      legacyStore: null,
      legacyCatalog: value,
      workStore: null,
    };
  }

  return null;
}
