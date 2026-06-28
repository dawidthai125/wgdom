/**
 * Biblioteka Robót i Cennik v3.0 — migracja legacy cost catalog (v1) → WorkCatalogStore (v3).
 * Pure · deterministyczna · idempotentna · bez I/O.
 */

import {
  getCategoryRate,
  type WgdomCostCatalog,
  type WgdomCostCatalogStore,
  type WgdomCostCategoryId,
  type WgdomCostRegion,
  type WgdomCostUnit,
} from "@/lib/wgdom-cost-catalog";
import {
  deriveCostSplitFromLegacyRate,
  mergeCompanyPriceFromLegacyRate,
} from "@/lib/work-catalog/cost-split";
import { withFreshnessStatus } from "@/lib/work-catalog/freshness";
import {
  SEED_MANIFEST_VERSION,
  type SeedManifestDocument,
  type SeedManifestWorkEntry,
} from "@/lib/work-catalog/seed-manifest";
import { TRADE_IDS, type TradeId } from "@/lib/work-catalog/trades";
import {
  WORK_CATALOG_SCHEMA_VERSION,
  type CatalogWork,
  type WorkCatalogRegionSlice,
  type WorkCatalogStore,
} from "@/lib/work-catalog/types";

const LEGACY_REGIONS: WgdomCostRegion[] = ["wroclaw", "dolnyslask"];

/** Mapowanie kategorii legacy → TradeId (TEP P1 §2.5 — odwrotność tabeli adaptera). */
export const LEGACY_CATEGORY_TO_TRADE: Record<Exclude<WgdomCostCategoryId, "UNKNOWN">, TradeId> = {
  ROZBIORKI: "ROZBIORKI",
  ROBOTY_OGOLNOBUDOWLANE: "PRZYGOTOWANIE",
  TRANSPORT_UTYLIZACJA: "TRANSPORT",
  GK: "SCIANY_GK",
  GLADZIE_TYNKI: "SCIANY_GK",
  MALOWANIE: "MALOWANIE",
  GLAZURA: "LAZIENKA",
  PODLOGI: "PODLOGI",
  ELEKTRYKA: "ELEKTRYKA",
  INSTALACJE_GAZ: "OGRZEWANIE",
  INSTALACJE_CO: "OGRZEWANIE",
  HYDRAULIKA: "HYDRAULIKA",
  WENTYLACJA: "WENTYLACJA",
  STOLARKA: "DRZWI",
  WYPOSAZENIE: "MONTAZ",
};

export interface MigrationResult {
  worksMigrated: number;
  worksSkipped: number;
  unknownCategories: string[];
  unknownUnits: string[];
  warnings: string[];
}

export interface WorkCatalogMigrationOutput {
  store: WorkCatalogStore;
  result: MigrationResult;
}

export interface MigrateLegacyCostCatalogOptions {
  /** ISO timestamp zapisywany w store (bez Date.now()). */
  migratedAtIso: string;
  /** Znacznik „teraz” dla deriveFreshnessStatus (ms UTC). */
  nowMs: number;
  seedManifest?: SeedManifestDocument;
  referenceHourlyPln?: number;
}

function emptyMigrationResult(): MigrationResult {
  return {
    worksMigrated: 0,
    worksSkipped: 0,
    unknownCategories: [],
    unknownUnits: [],
    warnings: [],
  };
}

export function isWorkCatalogStoreV3(value: unknown): value is WorkCatalogStore {
  if (!value || typeof value !== "object") return false;
  const candidate = value as WorkCatalogStore;
  return (
    candidate.schemaVersion === WORK_CATALOG_SCHEMA_VERSION &&
    typeof candidate.catalogs === "object" &&
    candidate.catalogs != null
  );
}

export function isLegacyCostCatalogStore(value: unknown): value is WgdomCostCatalogStore {
  if (!value || typeof value !== "object") return false;
  return (value as WgdomCostCatalogStore).schemaVersion === 1;
}

export function mapLegacyCategoryToTradeId(categoryId: WgdomCostCategoryId): TradeId | null {
  if (categoryId === "UNKNOWN") return "POZOSTALE";
  return LEGACY_CATEGORY_TO_TRADE[categoryId] ?? null;
}

export function createEmptyWorkCatalogStore(
  migratedAtIso: string,
  activeRegion: WgdomCostRegion = "wroclaw",
): WorkCatalogStore {
  const emptySlice = (region: WgdomCostRegion): WorkCatalogRegionSlice => ({
    region,
    works: [],
    updatedAt: migratedAtIso,
  });

  return {
    schemaVersion: WORK_CATALOG_SCHEMA_VERSION,
    activeRegion,
    catalogs: {
      wroclaw: emptySlice("wroclaw"),
      dolnyslask: emptySlice("dolnyslask"),
    },
    updatedAt: migratedAtIso,
  };
}

/** Pusty szkielet v3 (bez robót) — używany gdy legacy jest pusty lub niekompletny. */
export function defaultWorkCatalogStore(
  migratedAtIso: string,
  activeRegion: WgdomCostRegion = "wroclaw",
): WorkCatalogStore {
  return {
    ...createEmptyWorkCatalogStore(migratedAtIso, activeRegion),
    tradesOrder: [...TRADE_IDS],
    seedManifestVersion: SEED_MANIFEST_VERSION,
  };
}

function cloneCatalogWork(work: CatalogWork): CatalogWork {
  return {
    ...work,
    keywords: [...work.keywords],
    costSplit: work.costSplit
      ? { materialRatio: work.costSplit.materialRatio, laborRatio: work.costSplit.laborRatio }
      : undefined,
  };
}

function cloneRegionSlice(slice: WorkCatalogRegionSlice): WorkCatalogRegionSlice {
  return {
    region: slice.region,
    works: slice.works.map(cloneCatalogWork),
    updatedAt: slice.updatedAt,
  };
}

/** Głęboka kopia store — wejście pozostaje nietknięte. */
export function cloneWorkCatalogStore(store: WorkCatalogStore): WorkCatalogStore {
  return {
    schemaVersion: store.schemaVersion,
    activeRegion: store.activeRegion,
    catalogs: {
      wroclaw: cloneRegionSlice(store.catalogs.wroclaw),
      dolnyslask: cloneRegionSlice(store.catalogs.dolnyslask),
    },
    tradesOrder: store.tradesOrder ? [...store.tradesOrder] : undefined,
    updatedAt: store.updatedAt,
    migratedFromLegacyAt: store.migratedFromLegacyAt,
    seedManifestVersion: store.seedManifestVersion,
  };
}

function buildManifestNameIndex(manifest?: SeedManifestDocument): Map<string, SeedManifestWorkEntry[]> {
  const index = new Map<string, SeedManifestWorkEntry[]>();
  if (!manifest?.works?.length) return index;

  for (const entry of manifest.works) {
    const key = `${entry.tradeId}\0${entry.unit}`;
    const bucket = index.get(key) ?? [];
    bucket.push(entry);
    index.set(key, bucket);
  }

  for (const bucket of index.values()) {
    bucket.sort((a, b) => a.id.localeCompare(b.id, "pl"));
  }

  return index;
}

function pickManifestName(
  index: Map<string, SeedManifestWorkEntry[]>,
  tradeId: TradeId,
  unit: WgdomCostUnit,
  usedManifestIds: Set<string>,
): SeedManifestWorkEntry | null {
  const bucket = index.get(`${tradeId}\0${unit}`);
  if (!bucket?.length) return null;
  return bucket.find((entry) => !usedManifestIds.has(entry.id)) ?? null;
}

const CANONICAL_UNITS: WgdomCostUnit[] = ["m2", "mb", "szt", "rbh", "m3", "kpl"];

/** Legacy rates używają kanonicznej j.m. bez mapowania kpl→szt (normalizeWgdomCostUnit). */
function asLegacyCatalogUnit(raw: unknown): WgdomCostUnit | null {
  if (typeof raw !== "string") return null;
  return (CANONICAL_UNITS as readonly string[]).includes(raw) ? (raw as WgdomCostUnit) : null;
}

function syntheticWorkId(categoryId: WgdomCostCategoryId, unit: WgdomCostUnit): string {
  return `legacy-${categoryId.toLowerCase()}-${unit}`;
}

function fallbackWorkName(labelPl: string, unit: WgdomCostUnit): string {
  return `${labelPl} (${unit})`;
}

function countLegacyRates(catalog: WgdomCostCatalog | undefined): number {
  if (!catalog?.categories?.length) return 0;
  let count = 0;
  for (const category of catalog.categories) {
    count += category.rates?.length ?? 0;
  }
  if (catalog.unknownFallback) count += 1;
  return count;
}

function migrateUnknownFallback(
  catalog: WgdomCostCatalog,
  options: MigrateLegacyCostCatalogOptions,
  manifestIndex: Map<string, SeedManifestWorkEntry[]>,
  usedManifestIds: Set<string>,
  result: MigrationResult,
): CatalogWork | null {
  const fb = catalog.unknownFallback;
  if (!fb) return null;

  const unit = asLegacyCatalogUnit(fb.defaultUnit);
  if (!unit) {
    result.unknownUnits.push(String(fb.defaultUnit));
    result.warnings.push(`Nieznana j.m. unknownFallback: ${String(fb.defaultUnit)}`);
    return null;
  }

  const materialPlnPerUnit = fb.materialPlnPerUnit * catalog.regionMultiplier;
  const laborRbhPerUnit = fb.laborRbhPerUnit;
  const tradeId: TradeId = "POZOSTALE";
  const companyPricePln = mergeCompanyPriceFromLegacyRate(
    materialPlnPerUnit,
    laborRbhPerUnit,
    options.referenceHourlyPln,
  );
  const costSplit = deriveCostSplitFromLegacyRate(
    materialPlnPerUnit,
    laborRbhPerUnit,
    options.referenceHourlyPln,
  );

  const manifestEntry = pickManifestName(manifestIndex, tradeId, unit, usedManifestIds);
  if (manifestEntry) usedManifestIds.add(manifestEntry.id);

  const updatedAt = catalog.updatedAt || options.migratedAtIso;
  const workBase: CatalogWork = {
    id: syntheticWorkId("UNKNOWN", unit),
    tradeId,
    namePl: manifestEntry?.name ?? fallbackWorkName("Pozostałe", unit),
    unit,
    companyPricePln,
    updatedAt,
    freshnessStatus: "ok",
    keywords: ["pozostale", "unknown", "inne"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "UNKNOWN",
    costSplit,
  };

  result.worksMigrated += 1;
  return withFreshnessStatus(workBase, options.nowMs);
}

function migrateLegacyCatalogRegion(
  catalog: WgdomCostCatalog | undefined,
  options: MigrateLegacyCostCatalogOptions,
  manifestIndex: Map<string, SeedManifestWorkEntry[]>,
  result: MigrationResult,
): WorkCatalogRegionSlice {
  const region = catalog?.region ?? "wroclaw";
  const updatedAt = catalog?.updatedAt || options.migratedAtIso;

  if (!catalog?.categories?.length) {
    return { region, works: [], updatedAt };
  }

  const usedManifestIds = new Set<string>();
  const works: CatalogWork[] = [];

  for (const category of catalog.categories) {
    for (const rate of category.rates ?? []) {
      const unit = asLegacyCatalogUnit(rate.unit);
      if (!unit) {
        result.unknownUnits.push(String(rate.unit));
        result.worksSkipped += 1;
        continue;
      }

      const tradeId = mapLegacyCategoryToTradeId(category.id);
      if (!tradeId) {
        if (!result.unknownCategories.includes(category.id)) {
          result.unknownCategories.push(category.id);
        }
        result.worksSkipped += 1;
        continue;
      }

      const resolved = getCategoryRate(catalog, category.id, unit);
      if (!resolved) {
        result.worksSkipped += 1;
        result.warnings.push(`Brak stawki legacy dla ${category.id} × ${unit}`);
        continue;
      }

      const companyPricePln = mergeCompanyPriceFromLegacyRate(
        resolved.materialPlnPerUnit,
        resolved.laborRbhPerUnit,
        options.referenceHourlyPln,
      );
      const costSplit = deriveCostSplitFromLegacyRate(
        resolved.materialPlnPerUnit,
        resolved.laborRbhPerUnit,
        options.referenceHourlyPln,
      );

      const manifestEntry = pickManifestName(manifestIndex, tradeId, unit, usedManifestIds);
      if (manifestEntry) usedManifestIds.add(manifestEntry.id);

      const workBase: CatalogWork = {
        id: syntheticWorkId(category.id, unit),
        tradeId,
        namePl: manifestEntry?.name ?? fallbackWorkName(category.labelPl, unit),
        unit,
        companyPricePln,
        updatedAt,
        freshnessStatus: "ok",
        keywords: [...category.keywords],
        active: true,
        favorite: false,
        usageCount: 0,
        source: "seed",
        legacyCategoryId: category.id,
        costSplit,
      };

      works.push(withFreshnessStatus(workBase, options.nowMs));
      result.worksMigrated += 1;
    }
  }

  const unknownWork = migrateUnknownFallback(catalog, options, manifestIndex, usedManifestIds, result);
  if (unknownWork) works.push(unknownWork);

  works.sort((a, b) => a.id.localeCompare(b.id, "pl"));

  return { region, works, updatedAt };
}

/**
 * Migracja legacy store → WorkCatalogStore v3 (catalogs per region — D1).
 * Idempotentna: store v3 zwracany jako głęboka kopia bez ponownej migracji.
 */
export function migrateLegacyCostCatalogStoreToWorkCatalog(
  input: WgdomCostCatalogStore | WorkCatalogStore,
  options: MigrateLegacyCostCatalogOptions,
): WorkCatalogMigrationOutput {
  if (isWorkCatalogStoreV3(input)) {
    return {
      store: cloneWorkCatalogStore(input),
      result: emptyMigrationResult(),
    };
  }

  const legacy = input as WgdomCostCatalogStore;
  const result = emptyMigrationResult();
  const manifestIndex = buildManifestNameIndex(options.seedManifest);

  const hasAnyCatalog = LEGACY_REGIONS.some(
    (region) => (legacy.catalogs?.[region]?.categories?.length ?? 0) > 0,
  );

  if (!isLegacyCostCatalogStore(legacy) || !hasAnyCatalog) {
    result.warnings.push("Pusty lub niepoprawny legacy store — zwrócono defaultWorkCatalogStore()");
    return {
      store: defaultWorkCatalogStore(options.migratedAtIso, legacy?.activeRegion ?? "wroclaw"),
      result,
    };
  }

  const catalogs = {} as Record<WgdomCostRegion, WorkCatalogRegionSlice>;

  for (const region of LEGACY_REGIONS) {
    catalogs[region] = migrateLegacyCatalogRegion(
      legacy.catalogs?.[region],
      options,
      manifestIndex,
      result,
    );
  }

  const store: WorkCatalogStore = {
    schemaVersion: WORK_CATALOG_SCHEMA_VERSION,
    activeRegion: legacy.activeRegion ?? "wroclaw",
    catalogs,
    tradesOrder: [...TRADE_IDS],
    updatedAt: options.migratedAtIso,
    migratedFromLegacyAt: options.migratedAtIso,
    seedManifestVersion: options.seedManifest?.manifestVersion ?? SEED_MANIFEST_VERSION,
  };

  return { store, result };
}

/** Liczba stawek legacy (rates + unknownFallback) — helper testowy / diagnostyczny. */
export function countLegacyCatalogRates(store: WgdomCostCatalogStore): number {
  let total = 0;
  for (const region of LEGACY_REGIONS) {
    total += countLegacyRates(store.catalogs?.[region]);
  }
  return total;
}
