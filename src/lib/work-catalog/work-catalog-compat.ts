/**
 * Biblioteka Robót i Cennik v3.0 — engine compat (P1.10 / #5C-5C F2).
 * Pure · read-only — `resolveCatalogForEngine` only.
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

export interface ResolveCatalogCompatOptions {
  region?: WgdomCostRegion;
  referenceHourlyPln?: number;
  updatedAtIso?: string;
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
