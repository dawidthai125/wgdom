/**
 * WORK-CATALOG-P0 — write safety regression (shrink guard · CAS · union · no blind push).
 * npx vite-node scripts/test-work-catalog-p0-write-safety.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-work-catalog-p0";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-work-catalog-p0";

import { defaultWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  C2_KNR_WC_1305_01_WORK_ID,
  C2_KNR_WC_1305_02_WORK_ID,
} from "../src/lib/intelligent-estimator/c2-knr-wc-prob-owner-create.ts";
import { C2_OWNER_OUR_RATE_PLN } from "../src/lib/intelligent-estimator/c2-knr-wc-prob-our-rate-ops.ts";
import { saveWorkCatalogRouted } from "../src/lib/catalog-write-router.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/work-rate-lookup.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";
import {
  assertWorkCatalogShrinkAllowed,
  findRemovedAuthoritativeWorkIds,
  findPerRegionRemovedAuthoritativeWorkIds,
  WorkCatalogShrinkRejectedError,
} from "../src/lib/work-catalog/work-catalog-authority.ts";
import { unionMergeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-merge-safety.ts";
import {
  pushWorkCatalogFromLocalUnionIfChanged,
  pushWorkCatalogStoreToCloudSafe,
  WorkCatalogStaleRevisionError,
} from "../src/lib/work-catalog/work-catalog-cloud-push.ts";
import { ensurePi31EticsApprovedDataLocal } from "../src/lib/price-intelligence/ensure-etics-approved-seed.ts";
import { fetchAndMergeDeferredBootstrap, pushMergedDataBundleToCloud, DATA_KEYS } from "../src/lib/cloud-sync.ts";
import {
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  WORK_CATALOG_META_KEY,
  normalizeWorkCatalogMeta,
  writeWorkCatalogMetaToLs,
} from "../src/lib/work-catalog/work-catalog-meta.ts";

const NOW = "2026-08-26T22:43:11.682Z";
const LEGACY_ID = "legacy-elektryka-szt";

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(String(k), String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

let cloudCatalog = null;
let cloudMeta = normalizeWorkCatalogMeta(null);
const batchSetBodies = [];

function makeOurRate(id, unit, ourRatePln) {
  return {
    workId: id,
    unit,
    ourRatePln,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: NOW,
    updatedAt: NOW,
  };
}

function makeWork(id, unit, ourRatePln) {
  return {
    id,
    tradeId: "ELEKTRYKA",
    namePl: id,
    unit,
    companyPricePln: 0,
    ourWorkRate: ourRatePln != null ? makeOurRate(id, unit, ourRatePln) : undefined,
    updatedAt: NOW,
    freshnessStatus: ourRatePln != null ? "ok" : "missing",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

function buildBase41Store() {
  const store = defaultWorkCatalogStore();
  const works = [];
  for (let i = 0; i < 39; i += 1) {
    works.push(makeWork(`custom-work-${i}`, "szt", i === 0 ? 99 : undefined));
  }
  works.push(makeWork(LEGACY_ID, "szt", 40));
  works.push(makeWork("legacy-other-szt", "szt"));
  store.catalogs.wroclaw.works = works;
  store.catalogs.wroclaw.updatedAt = NOW;
  store.updatedAt = "2026-08-24T12:00:00.000Z";
  return normalizeWorkCatalogStore(store);
}

function buildCloud43Store() {
  const store = buildBase41Store();
  const extra = [
    makeWork(C2_KNR_WC_1305_01_WORK_ID, "prob", C2_OWNER_OUR_RATE_PLN["1305-01"]),
    makeWork(C2_KNR_WC_1305_02_WORK_ID, "prob", C2_OWNER_OUR_RATE_PLN["1305-02"]),
  ];
  store.catalogs.wroclaw.works = [...store.catalogs.wroclaw.works, ...extra];
  store.updatedAt = NOW;
  store.catalogs.wroclaw.updatedAt = NOW;
  return normalizeWorkCatalogStore(store);
}

function cloneWorks(works) {
  return JSON.parse(JSON.stringify(works));
}

/** Mirror wroclaw works into dolnyslask (production-like 41/41 or 43/43). */
function mirrorRegions(store) {
  const works = cloneWorks(store.catalogs.wroclaw.works);
  store.catalogs.dolnyslask.works = cloneWorks(works);
  store.catalogs.dolnyslask.updatedAt = store.catalogs.wroclaw.updatedAt ?? store.updatedAt;
  return normalizeWorkCatalogStore(store);
}

function buildMirrored41Store() {
  return mirrorRegions(buildBase41Store());
}

function buildMirrored43Store() {
  return mirrorRegions(buildCloud43Store());
}

function countRegionWorks(raw, region) {
  if (!raw) return 0;
  return normalizeWorkCatalogStore(raw).catalogs[region].works.length;
}

function removeWorkFromRegion(store, region, workId) {
  const next = JSON.parse(JSON.stringify(store));
  next.catalogs[region].works = next.catalogs[region].works.filter((w) => w.id !== workId);
  return normalizeWorkCatalogStore(next);
}

function addWorkToRegion(store, region, work) {
  const next = JSON.parse(JSON.stringify(store));
  next.catalogs[region].works = [...next.catalogs[region].works, work];
  next.updatedAt = NOW;
  next.catalogs[region].updatedAt = NOW;
  return normalizeWorkCatalogStore(next);
}

function countWorks(raw) {
  if (!raw) return 0;
  const s = normalizeWorkCatalogStore(raw);
  return s.catalogs.wroclaw.works.length + s.catalogs.dolnyslask.works.length;
}

function resetKv(catalog, metaRev = 1) {
  cloudCatalog = catalog ? JSON.parse(JSON.stringify(catalog)) : null;
  cloudMeta = normalizeWorkCatalogMeta({ catalogRevision: metaRev, updatedAt: Date.now() });
  batchSetBodies.length = 0;
  catalogCasAttempt = 0;
  storage.clear();
  if (cloudCatalog) {
    saveWorkCatalogStoreLocal(normalizeWorkCatalogStore(cloudCatalog), {
      updatedAtIso: cloudCatalog.updatedAt,
    });
  }
  writeWorkCatalogMetaToLs(cloudMeta);
}

let catalogCasAttempt = 0;

globalThis.fetch = async (url, init) => {
  const urlStr = String(url);
  if (urlStr.includes("batch-get")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const keys = Array.isArray(body.keys) ? body.keys : [];
    return new Response(
      JSON.stringify({
        values: keys.map((key) => {
          if (key === WORK_CATALOG_STORAGE_KEY) return cloudCatalog;
          if (key === WORK_CATALOG_META_KEY) return cloudMeta;
          return null;
        }),
      }),
      { status: 200 },
    );
  }
  if (urlStr.includes("batch-set") && init?.body) {
    const parsed = JSON.parse(String(init.body));
    batchSetBodies.push(parsed);
    const catIdx = parsed.keys?.indexOf(WORK_CATALOG_STORAGE_KEY) ?? -1;
    if (catIdx >= 0 && parsed.workCatalogCas === true) {
      const incoming = parsed.values[catIdx];
      const removed = cloudCatalog
        ? findRemovedAuthoritativeWorkIds(
            normalizeWorkCatalogStore(cloudCatalog),
            normalizeWorkCatalogStore(incoming),
          )
        : [];
      if (removed.length > 0) {
        return new Response(
          JSON.stringify({
            ok: false,
            code: "catalog_shrink_rejected",
            removedWorkIds: removed,
            serverRevision: cloudMeta.catalogRevision,
            requestId: "mock-shrink-global",
          }),
          { status: 409 },
        );
      }
      const perRegion = cloudCatalog
        ? findPerRegionRemovedAuthoritativeWorkIds(
            normalizeWorkCatalogStore(cloudCatalog),
            normalizeWorkCatalogStore(incoming),
          )
        : [];
      if (perRegion.length > 0) {
        const first = perRegion[0];
        return new Response(
          JSON.stringify({
            ok: false,
            code: "catalog_shrink_rejected",
            region: first.region,
            removedWorkIds: first.removedWorkIds,
            serverRevision: cloudMeta.catalogRevision,
            requestId: "mock-shrink-per-region",
          }),
          { status: 409 },
        );
      }
      const expRev = parsed.expectedCatalogRevision;
      if (expRev !== cloudMeta.catalogRevision) {
        return new Response(
          JSON.stringify({
            ok: false,
            code: "catalog_stale_revision",
            serverRevision: cloudMeta.catalogRevision,
            catalog: cloudCatalog,
            requestId: "mock-stale",
          }),
          { status: 409 },
        );
      }
      catalogCasAttempt += 1;
      cloudCatalog = JSON.parse(JSON.stringify(incoming));
      cloudMeta = {
        catalogRevision: cloudMeta.catalogRevision + 1,
        updatedAt: Date.now(),
      };
      return new Response(
        JSON.stringify({
          ok: true,
          workCatalogMeta: cloudMeta,
          requestId: "mock-ok",
        }),
        { status: 200 },
      );
    }
    if (catIdx >= 0 && parsed.workCatalogCas !== true) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "catalog_legacy_client_rejected",
          requestId: "mock-legacy",
        }),
        { status: 409 },
      );
    }
    return new Response(JSON.stringify({ ok: true, requestId: "mock-generic" }), { status: 200 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

let pass = 0;
let fail = 0;
function assert(name, cond, extra = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra);
  }
}

{
  const cloud43 = buildCloud43Store();
  const stale41 = buildBase41Store();
  let threw = false;
  try {
    assertWorkCatalogShrinkAllowed(cloud43, stale41);
  } catch (e) {
    threw = e instanceof WorkCatalogShrinkRejectedError;
    assert(
      "T1 shrink lists C2 ids",
      e.removedWorkIds.includes(C2_KNR_WC_1305_01_WORK_ID)
        && e.removedWorkIds.includes(C2_KNR_WC_1305_02_WORK_ID),
      String(e.removedWorkIds),
    );
  }
  assert("T1 43→41 shrink rejected", threw);
}

{
  const cloud43 = buildCloud43Store();
  const stale41 = buildBase41Store();
  const merged = unionMergeWorkCatalogStore(cloud43, stale41);
  assert(
    "T2 union keeps C2 works",
    getWorkByIdFromStore(merged, C2_KNR_WC_1305_01_WORK_ID, merged.activeRegion)?.id
      === C2_KNR_WC_1305_01_WORK_ID,
  );
  assert("T2 union work count 43", merged.catalogs.wroclaw.works.length >= 43);
}

{
  resetKv(buildCloud43Store(), 2);
  const stale41 = buildBase41Store();
  saveWorkCatalogStoreLocal(stale41, { updatedAtIso: stale41.updatedAt });
  writeWorkCatalogMetaToLs({ catalogRevision: 0, updatedAt: Date.now() });
  const routed = await saveWorkCatalogRouted(stale41, { updatedAtIso: stale41.updatedAt });
  assert(
    "C2 stale intent blocked",
    routed.ok && routed.saved === false && routed.blocked === "catalog_shrink_rejected",
    JSON.stringify(routed),
  );
  assert("C2 cloud remains 43", countWorks(cloudCatalog) === 43, String(countWorks(cloudCatalog)));
  const cloudNorm = normalizeWorkCatalogStore(cloudCatalog);
  const w1 = getWorkByIdFromStore(cloudNorm, C2_KNR_WC_1305_01_WORK_ID, cloudNorm.activeRegion);
  const w2 = getWorkByIdFromStore(cloudNorm, C2_KNR_WC_1305_02_WORK_ID, cloudNorm.activeRegion);
  assert(
    "C2 OUR RATE 60/20 preserved",
    w1?.ourWorkRate?.ourRatePln === 60 && w2?.ourWorkRate?.ourRatePln === 20,
  );
}

{
  resetKv(buildBase41Store(), 0);
  const promoted = buildCloud43Store();
  saveWorkCatalogStoreLocal(promoted, { updatedAtIso: promoted.updatedAt });
  await pushWorkCatalogStoreToCloudSafe(promoted, { mode: "intent" });
  assert("T3 promotion cloud 43", countWorks(cloudCatalog) === 43);
}

{
  resetKv(buildCloud43Store(), 1);
  const next = buildCloud43Store();
  const w = getWorkByIdFromStore(next, C2_KNR_WC_1305_01_WORK_ID, next.activeRegion);
  if (w?.ourWorkRate) w.ourWorkRate.ourRatePln = 61;
  next.updatedAt = "2026-08-27T10:00:00.000Z";
  saveWorkCatalogStoreLocal(next, { updatedAtIso: next.updatedAt });
  await pushWorkCatalogStoreToCloudSafe(next, { mode: "intent" });
  const after = normalizeWorkCatalogStore(cloudCatalog);
  const rw = getWorkByIdFromStore(after, C2_KNR_WC_1305_01_WORK_ID, after.activeRegion);
  assert("T4 43→43 update succeeds", rw?.ourWorkRate?.ourRatePln === 61);
}

{
  resetKv(buildCloud43Store(), 3);
  const local41 = buildBase41Store();
  saveWorkCatalogStoreLocal(local41);
  const mergedPreview = unionMergeWorkCatalogStore(buildCloud43Store(), local41);
  const touch = mergedPreview.catalogs.wroclaw.works.find((w) => w.id === "custom-work-1");
  if (touch) touch.namePl = "custom-work-1-touched";
  mergedPreview.updatedAt = "2026-08-27T11:00:00.000Z";
  saveWorkCatalogStoreLocal(mergedPreview, { updatedAtIso: mergedPreview.updatedAt });
  batchSetBodies.length = 0;
  await pushWorkCatalogFromLocalUnionIfChanged();
  assert("T5 union push keeps 43", countWorks(cloudCatalog) === 43);
  const last = batchSetBodies.filter((b) => b.workCatalogCas === true).at(-1);
  assert("T5 uses CAS when changed", last?.workCatalogCas === true);
}

{
  resetKv(buildBase41Store(), 0);
  saveWorkCatalogStoreLocal(buildBase41Store());
  ensurePi31EticsApprovedDataLocal({ pushCloud: true });
  await new Promise((r) => setTimeout(r, 50));
  const blind = batchSetBodies.some(
    (b) => b.keys?.includes(WORK_CATALOG_STORAGE_KEY) && b.workCatalogCas !== true,
  );
  assert("T6 ensure no blind catalog batch-set", !blind);
}

{
  resetKv(buildCloud43Store(), 1);
  saveWorkCatalogStoreLocal(buildBase41Store());
  await fetchAndMergeDeferredBootstrap();
  const blind = batchSetBodies.some(
    (b) => b.keys?.includes(WORK_CATALOG_STORAGE_KEY) && b.workCatalogCas !== true,
  );
  assert("T7 deferred no blind catalog in bundle", !blind);
}

{
  resetKv(buildCloud43Store(), 2);
  saveWorkCatalogStoreLocal(buildBase41Store());
  const merged = DATA_KEYS.map((k) => {
    if (k === WORK_CATALOG_STORAGE_KEY) return buildBase41Store();
    if (k === "kw-jobs") return [{ id: "j1" }];
    return null;
  });
  batchSetBodies.length = 0;
  await pushMergedDataBundleToCloud(merged);
  const blindRs = batchSetBodies.some(
    (b) => Array.isArray(b.keys) && b.keys.includes(WORK_CATALOG_STORAGE_KEY) && b.workCatalogCas !== true,
  );
  assert("T8 RS no blind catalog key", !blindRs);
}

{
  resetKv(buildCloud43Store(), 5);
  const next = buildCloud43Store();
  catalogCasAttempt = 0;
  const beforeRev = cloudMeta.catalogRevision;
  await pushWorkCatalogStoreToCloudSafe(next, { mode: "intent" });
  assert("T9 CAS retry path succeeds", cloudMeta.catalogRevision === beforeRev + 1);
  assert("T9 CAS used at least one attempt", catalogCasAttempt >= 1);
}

{
  resetKv(buildCloud43Store(), 7);
  const next = buildCloud43Store();
  const beforeRev = cloudMeta.catalogRevision;
  let wrongCasOnce = true;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("batch-set") && init?.body) {
      const parsed = JSON.parse(String(init.body));
      if (parsed.workCatalogCas === true && wrongCasOnce) {
        wrongCasOnce = false;
        parsed.expectedCatalogRevision = cloudMeta.catalogRevision + 100;
        init = { ...init, body: JSON.stringify(parsed) };
      }
    }
    return originalFetch(url, init);
  };
  let staleThrown = false;
  try {
    await pushWorkCatalogStoreToCloudSafe(next, { mode: "intent" });
  } catch (e) {
    staleThrown = e instanceof WorkCatalogStaleRevisionError;
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert("T9b CAS stale retry succeeds", !staleThrown);
  assert("T9b revision bumped after retry", cloudMeta.catalogRevision === beforeRev + 1);
}

{
  const store = buildCloud43Store();
  const legacy = getWorkByIdFromStore(store, LEGACY_ID, store.activeRegion);
  assert("T11 legacy-elektryka-szt present", legacy?.id === LEGACY_ID);
  const lr = lookupWorkRate(store, LEGACY_ID, "szt", Date.now());
  assert("T12 legacy OUR RATE unchanged", lr.status !== "MISSING" && lr.ourRatePln === 40);
  const p1 = getWorkByIdFromStore(store, C2_KNR_WC_1305_01_WORK_ID, store.activeRegion);
  assert("T13 1305 prob unit", p1?.unit === "prob");
  const miss = lookupWorkRate(store, C2_KNR_WC_1305_01_WORK_ID, "szt", Date.now());
  assert("T14 1305 szt lookup missing", miss.status === "MISSING");
}

const INCIDENT_WORK_ID = "cc-p0c-w1-stop-ptakow";

// --- P0.1 per-region shrink (T15–T26) ---

{
  const base = buildMirrored41Store();
  const victim = base.catalogs.wroclaw.works.find((w) => !w.id.startsWith("legacy-"))?.id;
  const candidate = removeWorkFromRegion(base, "wroclaw", victim);
  let threw = false;
  let region = null;
  try {
    assertWorkCatalogShrinkAllowed(base, candidate);
  } catch (e) {
    threw = e instanceof WorkCatalogShrinkRejectedError;
    region = e.region;
    assert("T15 removed id listed", e.removedWorkIds.includes(victim), String(e.removedWorkIds));
  }
  assert("T15 41/41→40/41 wroclaw-only shrink rejected", threw && region === "wroclaw");
}

{
  const base = buildMirrored41Store();
  const victim = base.catalogs.dolnyslask.works.find((w) => !w.id.startsWith("legacy-"))?.id;
  const candidate = removeWorkFromRegion(base, "dolnyslask", victim);
  let threw = false;
  try {
    assertWorkCatalogShrinkAllowed(base, candidate);
  } catch (e) {
    threw = e instanceof WorkCatalogShrinkRejectedError && e.region === "dolnyslask";
  }
  assert("T16 41/41→41/40 dolnyslask-only shrink rejected", threw);
}

{
  const base = buildMirrored43Store();
  const victim = base.catalogs.wroclaw.works.find((w) => !w.id.startsWith("legacy-"))?.id;
  const candidate = removeWorkFromRegion(base, "wroclaw", victim);
  let threw = false;
  try {
    assertWorkCatalogShrinkAllowed(base, candidate);
  } catch (e) {
    threw = e instanceof WorkCatalogShrinkRejectedError;
  }
  assert("T17 43/43→42/43 rejected", threw);
}

{
  const base = buildMirrored43Store();
  const victim = base.catalogs.dolnyslask.works.find((w) => !w.id.startsWith("legacy-"))?.id;
  const candidate = removeWorkFromRegion(base, "dolnyslask", victim);
  let threw = false;
  try {
    assertWorkCatalogShrinkAllowed(base, candidate);
  } catch (e) {
    threw = e instanceof WorkCatalogShrinkRejectedError && e.region === "dolnyslask";
  }
  assert("T18 43/43→43/42 rejected", threw);
}

{
  resetKv(buildMirrored43Store(), 4);
  const next = buildMirrored43Store();
  const w = getWorkByIdFromStore(next, C2_KNR_WC_1305_02_WORK_ID, next.activeRegion);
  if (w?.ourWorkRate) w.ourWorkRate.ourRatePln = 21;
  next.updatedAt = "2026-08-27T12:00:00.000Z";
  await pushWorkCatalogStoreToCloudSafe(next, { mode: "intent" });
  const after = normalizeWorkCatalogStore(cloudCatalog);
  const rw = getWorkByIdFromStore(after, C2_KNR_WC_1305_02_WORK_ID, after.activeRegion);
  assert("T19 43/43 update allowed", rw?.ourWorkRate?.ourRatePln === 21);
  assert("T19 mirrored counts", countRegionWorks(cloudCatalog, "wroclaw") === 43 && countRegionWorks(cloudCatalog, "dolnyslask") === 43);
}

{
  resetKv(buildMirrored41Store(), 1);
  const next = addWorkToRegion(buildMirrored41Store(), "wroclaw", makeWork("additive-wroclaw-only", "szt", 55));
  await pushWorkCatalogStoreToCloudSafe(next, { mode: "intent" });
  assert("T20 41/41→42/41 additive wroclaw", countRegionWorks(cloudCatalog, "wroclaw") === 42);
  assert("T20 dolnyslask unchanged 41", countRegionWorks(cloudCatalog, "dolnyslask") === 41);
}

{
  resetKv(buildMirrored41Store(), 2);
  const next = addWorkToRegion(buildMirrored41Store(), "dolnyslask", makeWork("additive-dol-only", "m2"));
  await pushWorkCatalogStoreToCloudSafe(next, { mode: "intent" });
  assert("T21 41/41→41/42 additive dolnyslask", countRegionWorks(cloudCatalog, "dolnyslask") === 42);
  assert("T21 wroclaw unchanged 41", countRegionWorks(cloudCatalog, "wroclaw") === 41);
}

{
  resetKv(buildMirrored41Store(), 3);
  const base = buildMirrored41Store();
  const candidate = removeWorkFromRegion(base, "wroclaw", LEGACY_ID);
  let threw = false;
  try {
    assertWorkCatalogShrinkAllowed(base, candidate);
  } catch {
    threw = true;
  }
  assert("T22 legacy-only regional removal allowed", !threw);
  saveWorkCatalogStoreLocal(candidate);
  await pushWorkCatalogStoreToCloudSafe(candidate, { mode: "intent" });
  assert("T22 cloud write succeeded", countRegionWorks(cloudCatalog, "wroclaw") === 40);
}

{
  const base = buildMirrored41Store();
  const victim = "custom-work-0";
  const candidate = removeWorkFromRegion(base, "wroclaw", victim);
  const globalRemoved = findRemovedAuthoritativeWorkIds(base, candidate);
  const perRegion = findPerRegionRemovedAuthoritativeWorkIds(base, candidate);
  assert("T23 global union unchanged", globalRemoved.length === 0, String(globalRemoved));
  assert("T23 per-region violation present", perRegion.length === 1 && perRegion[0].region === "wroclaw");
  let threw = false;
  try {
    assertWorkCatalogShrinkAllowed(base, candidate);
  } catch (e) {
    threw = e instanceof WorkCatalogShrinkRejectedError;
  }
  assert("T23 regional membership reduced rejected", threw);
}

{
  resetKv(buildMirrored41Store(), 5);
  const cloud41 = buildMirrored41Store();
  const victim = cloud41.catalogs.wroclaw.works.find((w) => !w.id.startsWith("legacy-"))?.id;
  const local40 = removeWorkFromRegion(cloud41, "wroclaw", victim);
  saveWorkCatalogStoreLocal(local40);
  batchSetBodies.length = 0;
  await pushWorkCatalogFromLocalUnionIfChanged();
  assert("T24 union preserves 41/41 wroclaw", countRegionWorks(cloudCatalog, "wroclaw") === 41);
  assert("T24 union preserves 41/41 dolnyslask", countRegionWorks(cloudCatalog, "dolnyslask") === 41);
}

{
  resetKv(buildMirrored41Store(), 6);
  const base = buildMirrored41Store();
  const victim = base.catalogs.wroclaw.works.find((w) => !w.id.startsWith("legacy-"))?.id;
  const shrinkCandidate = removeWorkFromRegion(base, "wroclaw", victim);
  const beforeRev = cloudMeta.catalogRevision;
  let staleThrown = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("batch-set") && init?.body) {
      const parsed = JSON.parse(String(init.body));
      if (parsed.workCatalogCas === true) {
        parsed.expectedCatalogRevision = cloudMeta.catalogRevision + 50;
        init = { ...init, body: JSON.stringify(parsed) };
      }
    }
    return originalFetch(url, init);
  };
  try {
    await pushWorkCatalogStoreToCloudSafe(shrinkCandidate, { mode: "intent" });
  } catch (e) {
    staleThrown =
      e instanceof WorkCatalogStaleRevisionError || e instanceof WorkCatalogShrinkRejectedError;
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert("T25 stale+shrink no successful write", staleThrown);
  assert("T25 revision unchanged", cloudMeta.catalogRevision === beforeRev);
  assert("T25 wroclaw still 41", countRegionWorks(cloudCatalog, "wroclaw") === 41);
}

{
  resetKv(buildMirrored41Store(), 8);
  const base = buildMirrored41Store();
  const victim = base.catalogs.wroclaw.works.find((w) => !w.id.startsWith("legacy-"))?.id;
  const shrinkCandidate = removeWorkFromRegion(base, "wroclaw", victim);
  const res = await fetch("https://mock/batch-set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keys: [WORK_CATALOG_STORAGE_KEY],
      values: [shrinkCandidate],
      workCatalogCas: false,
    }),
  });
  const body = await res.json();
  assert("T26 legacy client regional shrink legacy reject", res.status === 409 && body.code === "catalog_legacy_client_rejected");
  assert("T26 KV unchanged", countRegionWorks(cloudCatalog, "wroclaw") === 41);
}

{
  resetKv(buildMirrored41Store(), 9);
  const base = buildMirrored41Store();
  const slot = base.catalogs.wroclaw.works.findIndex((w) => w.id === "custom-work-0");
  if (slot >= 0) base.catalogs.wroclaw.works[slot].id = INCIDENT_WORK_ID;
  const mirrored = mirrorRegions(base);
  cloudCatalog = JSON.parse(JSON.stringify(mirrored));
  const beforeRev = cloudMeta.catalogRevision;
  const candidate = removeWorkFromRegion(mirrored, "wroclaw", INCIDENT_WORK_ID);
  assert(
    "INCIDENT candidate shape 41/41→40/41",
    countRegionWorks(candidate, "wroclaw") === 40 && countRegionWorks(candidate, "dolnyslask") === 41,
  );
  const res = await fetch("https://mock/batch-set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keys: [WORK_CATALOG_STORAGE_KEY],
      values: [candidate],
      workCatalogCas: true,
      expectedCatalogRevision: cloudMeta.catalogRevision,
    }),
  });
  const body = await res.json();
  assert(
    "INCIDENT 41/41→40/41 wroclaw-only → 409 shrink",
    res.status === 409 && body.code === "catalog_shrink_rejected" && body.region === "wroclaw",
    JSON.stringify(body),
  );
  assert(
    "INCIDENT removedWorkIds",
    Array.isArray(body.removedWorkIds) && body.removedWorkIds.includes(INCIDENT_WORK_ID),
  );
  assert("INCIDENT KV unchanged", countRegionWorks(cloudCatalog, "wroclaw") === 41);
  assert("INCIDENT revision unchanged", cloudMeta.catalogRevision === beforeRev);
}

console.log(`\nRESULT ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
