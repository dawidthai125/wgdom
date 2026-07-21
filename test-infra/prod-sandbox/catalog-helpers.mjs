/**
 * TEST-HARNESS-01 H5 — Work Catalog helpers (in-memory store shape only).
 * No kv-client calls · no Core merge import (#H5-005).
 * DF fixture §5.4 · D-H5-07.
 */
import { isPsbId } from "./markers.mjs";

export const WORK_CATALOG_KEY = "kw-wgdom-work-catalog";
export const WORK_CATALOG_SCHEMA_VERSION = 4;

/** @typedef {"wroclaw"|"dolnyslask"} WorkCatalogRegion */

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
export function coerceWorkCatalogStore(raw) {
  const now = new Date().toISOString();
  if (!raw || typeof raw !== "object") {
    return emptyWorkCatalogStore("wroclaw", now);
  }
  const s = /** @type {Record<string, unknown>} */ (raw);
  const activeRegion =
    s.activeRegion === "dolnyslask" || s.activeRegion === "wroclaw"
      ? s.activeRegion
      : "wroclaw";
  const catalogsRaw =
    s.catalogs && typeof s.catalogs === "object"
      ? /** @type {Record<string, unknown>} */ (s.catalogs)
      : {};
  return {
    schemaVersion: WORK_CATALOG_SCHEMA_VERSION,
    activeRegion,
    catalogs: {
      wroclaw: coerceRegionSlice("wroclaw", catalogsRaw.wroclaw, now),
      dolnyslask: coerceRegionSlice("dolnyslask", catalogsRaw.dolnyslask, now),
    },
    updatedAt: typeof s.updatedAt === "string" && s.updatedAt ? s.updatedAt : now,
    tradesOrder: Array.isArray(s.tradesOrder) ? s.tradesOrder : undefined,
    migratedFromLegacyAt:
      typeof s.migratedFromLegacyAt === "string" ? s.migratedFromLegacyAt : undefined,
    seedManifestVersion:
      typeof s.seedManifestVersion === "string" ? s.seedManifestVersion : undefined,
  };
}

/**
 * @param {WorkCatalogRegion} region
 * @param {unknown} raw
 * @param {string} fallbackUpdatedAt
 */
function coerceRegionSlice(region, raw, fallbackUpdatedAt) {
  if (!raw || typeof raw !== "object") {
    return { region, works: [], updatedAt: fallbackUpdatedAt };
  }
  const slice = /** @type {Record<string, unknown>} */ (raw);
  const works = Array.isArray(slice.works)
    ? slice.works.filter((w) => w && typeof w === "object")
    : [];
  return {
    region,
    works: /** @type {Record<string, unknown>[]} */ (works),
    updatedAt:
      typeof slice.updatedAt === "string" && slice.updatedAt
        ? slice.updatedAt
        : fallbackUpdatedAt,
  };
}

/**
 * @param {WorkCatalogRegion} activeRegion
 * @param {string} updatedAt
 */
export function emptyWorkCatalogStore(activeRegion, updatedAt) {
  return {
    schemaVersion: WORK_CATALOG_SCHEMA_VERSION,
    activeRegion,
    catalogs: {
      wroclaw: { region: "wroclaw", works: [], updatedAt },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt },
    },
    updatedAt,
  };
}

/**
 * @param {Record<string, unknown>} store
 * @returns {WorkCatalogRegion}
 */
export function resolveRegion(store) {
  const ar = store.activeRegion;
  if (ar === "dolnyslask" || ar === "wroclaw") return ar;
  return "wroclaw";
}

/**
 * DF §5.4 frozen fixture
 * @param {string} id
 * @param {{ keywords?: string[], namePl?: string }} [opts]
 */
export function buildSandboxCatalogWork(id, opts = {}) {
  const now = new Date().toISOString();
  const short = String(id).replace(/^psb-catalog-/, "").slice(0, 16);
  return {
    id,
    namePl: opts.namePl || `psb-h5-${short}`,
    tradeId: "MALOWANIE",
    unit: "szt",
    companyPricePln: 1,
    keywords: opts.keywords || ["psb-h5-kw"],
    freshnessStatus: "ok",
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    updatedAt: now,
  };
}

/**
 * @param {Record<string, unknown>} store
 * @param {WorkCatalogRegion} [region]
 */
export function listWorks(store, region) {
  const r = region || resolveRegion(store);
  const catalogs = /** @type {Record<string, { works?: unknown[] }>} */ (
    store.catalogs || {}
  );
  const slice = catalogs[r];
  return Array.isArray(slice?.works) ? slice.works : [];
}

/**
 * @param {unknown[]} works
 */
export function countNonPsbWorks(works) {
  return works.filter(
    (w) => w && typeof w === "object" && !isPsbId(/** @type {{id?:string}} */ (w).id),
  ).length;
}

/**
 * Stable fingerprint of non-psb keywords (both regions) for contamination assert.
 * @param {Record<string, unknown>} store
 */
export function nonPsbKeywordsFingerprint(store) {
  /** @type {string[]} */
  const parts = [];
  for (const region of /** @type {WorkCatalogRegion[]} */ (["wroclaw", "dolnyslask"])) {
    for (const w of listWorks(store, region)) {
      if (!w || typeof w !== "object") continue;
      const id = /** @type {{id?:string}} */ (w).id;
      if (isPsbId(id)) continue;
      const kws = Array.isArray(/** @type {{keywords?:unknown}} */ (w).keywords)
        ? /** @type {{keywords:unknown[]}} */ (w).keywords.map(String)
        : [];
      parts.push(`${region}:${id}:${kws.join(",")}`);
    }
  }
  parts.sort();
  return parts.join("|");
}

/**
 * @param {Record<string, unknown>} store
 */
export function countNonPsbBothRegions(store) {
  return (
    countNonPsbWorks(listWorks(store, "wroclaw")) +
    countNonPsbWorks(listWorks(store, "dolnyslask"))
  );
}

/**
 * @param {Record<string, unknown>} store
 * @param {string} id
 */
export function findWorkById(store, id) {
  for (const region of /** @type {WorkCatalogRegion[]} */ (["wroclaw", "dolnyslask"])) {
    const found = listWorks(store, region).find(
      (w) => w && typeof w === "object" && /** @type {{id?:string}} */ (w).id === id,
    );
    if (found) return { work: /** @type {Record<string, unknown>} */ (found), region };
  }
  return null;
}

/**
 * @param {Record<string, unknown>} store
 * @returns {Record<string, unknown>}
 */
export function bumpUpdatedAt(store) {
  const now = new Date().toISOString();
  const region = resolveRegion(store);
  const catalogs = /** @type {Record<string, Record<string, unknown>>} */ ({
    ...(typeof store.catalogs === "object" && store.catalogs ? store.catalogs : {}),
  });
  const slice = catalogs[region] || { region, works: [], updatedAt: now };
  catalogs[region] = { ...slice, updatedAt: now };
  return {
    ...store,
    schemaVersion: WORK_CATALOG_SCHEMA_VERSION,
    catalogs,
    updatedAt: now,
  };
}

/**
 * @param {Record<string, unknown>} store
 * @param {WorkCatalogRegion} region
 * @param {Record<string, unknown>} work
 */
export function upsertPsbWork(store, region, work) {
  const catalogs = /** @type {Record<string, Record<string, unknown>>} */ ({
    ...(typeof store.catalogs === "object" && store.catalogs ? store.catalogs : {}),
  });
  const slice = catalogs[region] || { region, works: [], updatedAt: store.updatedAt };
  const works = Array.isArray(slice.works) ? [...slice.works] : [];
  const idx = works.findIndex(
    (w) => w && typeof w === "object" && /** @type {{id?:string}} */ (w).id === work.id,
  );
  if (idx >= 0) works[idx] = work;
  else works.push(work);
  catalogs[region] = { ...slice, region, works };
  return bumpUpdatedAt({ ...store, catalogs, activeRegion: store.activeRegion || region });
}

/**
 * @param {Record<string, unknown>} store
 * @param {string} id
 * @param {{ keywords?: string[], namePl?: string }} patch
 */
export function editPsbWork(store, id, patch) {
  const found = findWorkById(store, id);
  if (!found) throw new Error(`H5_EDIT_MISSING: ${id}`);
  const next = {
    ...found.work,
    ...(patch.keywords ? { keywords: patch.keywords } : {}),
    ...(patch.namePl ? { namePl: patch.namePl } : {}),
    updatedAt: new Date().toISOString(),
  };
  return upsertPsbWork(store, found.region, next);
}

/**
 * Remove id from both regions.
 * @param {Record<string, unknown>} store
 * @param {string} id
 */
export function removePsbWork(store, id) {
  const catalogs = /** @type {Record<string, Record<string, unknown>>} */ ({
    ...(typeof store.catalogs === "object" && store.catalogs ? store.catalogs : {}),
  });
  for (const region of /** @type {WorkCatalogRegion[]} */ (["wroclaw", "dolnyslask"])) {
    const slice = catalogs[region] || { region, works: [], updatedAt: store.updatedAt };
    const works = Array.isArray(slice.works)
      ? slice.works.filter(
          (w) =>
            !(w && typeof w === "object" && /** @type {{id?:string}} */ (w).id === id),
        )
      : [];
    catalogs[region] = { ...slice, region, works };
  }
  return bumpUpdatedAt({ ...store, catalogs });
}

/**
 * Leftover check: session id still present in either region.
 * @param {Record<string, unknown>} store
 * @param {string} id
 */
export function workStillPresent(store, id) {
  return !!findWorkById(store, id);
}
