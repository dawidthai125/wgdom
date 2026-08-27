/**
 * ETAP 12J — OUR RATE persistence (stale whole-store wipe + preserve).
 *
 * npx vite-node scripts/test-our-work-rate-persistence-12j.mjs
 */
import {
  WORK_CATALOG_STORAGE_KEY,
  lookupWorkRate,
  mergeWorkCatalogStore,
  normalizeWorkCatalogStore,
  patchOurWorkRateInStore,
  preserveOurWorkRatesFromDonor,
  saveWorkCatalogStoreLocal,
  loadWorkCatalogStoreLocal,
} from "../src/lib/work-catalog/index.ts";
import { patchWorkCompanyPriceInStore } from "../src/app/work-catalog/work-catalog-price.ts";

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

const NOW = Date.parse("2026-08-21T12:00:00.000Z");
const T0 = "2026-08-20T10:00:00.000Z";
const T1 = "2026-08-21T11:00:00.000Z";
const T2 = "2026-08-21T12:00:00.000Z";

const WORK_ID = "cc-w2-wykwity-zacieki";
const UNIT = "m2";

function makeWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "SCIANY_GK",
    namePl: "Skasowanie wykwitów (zacieków)",
    unit: UNIT,
    companyPricePln: 28,
    updatedAt: T0,
    freshnessStatus: "ok",
    keywords: ["wykwity"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...overrides,
  };
}

function makeStore(works, updatedAt = T0) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt,
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt },
    },
  });
}

// ——— 1. canonical patch + normalize round-trip ———
{
  let store = makeStore([makeWork()]);
  const patched = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 55,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T1,
    updatedAt: T1,
  });
  ok("T1 patch ok", patched.ok === true);
  store = patched.store;
  eq("T1 ourRate", store.catalogs.wroclaw.works[0].ourWorkRate?.ourRatePln, 55);
  eq("T1 companyPrice untouched", store.catalogs.wroclaw.works[0].companyPricePln, 28);
  const round = normalizeWorkCatalogStore(JSON.parse(JSON.stringify(store)));
  eq("T1 normalize keeps ourRate", round.catalogs.wroclaw.works[0].ourWorkRate?.ourRatePln, 55);
  eq("T1 lookup CURRENT", lookupWorkRate(round, WORK_ID, UNIT, NOW).status, "CURRENT");
}

// ——— 2. local persistence ———
{
  storage.clear();
  let store = makeStore([makeWork()]);
  store = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 60,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T1,
    updatedAt: T1,
  }).store;
  saveWorkCatalogStoreLocal(store, { updatedAtIso: T1 });
  const loaded = loadWorkCatalogStoreLocal();
  eq("T2 LS key written", storage.has(WORK_CATALOG_STORAGE_KEY), true);
  eq("T2 LS ourRate", loaded.catalogs.wroclaw.works[0].ourWorkRate?.ourRatePln, 60);
  eq("T2 lookup CURRENT", lookupWorkRate(loaded, WORK_ID, UNIT, NOW).status, "CURRENT");
}

// ——— 3. companyPrice ≠ OUR RATE ———
{
  const store = makeStore([makeWork({ companyPricePln: 28 })]);
  const miss = lookupWorkRate(store, WORK_ID, UNIT, NOW);
  eq("T3 MISSING despite companyPrice 28", miss.status, "MISSING");
  eq("T3 ourRatePln null", miss.ourRatePln, null);
}

// ——— 4. repro: newer stale snapshot LWW would wipe (pre-preserve behavior documented) ———
{
  let withRate = makeStore([makeWork()], T1);
  withRate = patchOurWorkRateInStore(withRate, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 70,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T1,
    updatedAt: T1,
  }).store;
  withRate = { ...withRate, updatedAt: T1 };

  const staleNewer = makeStore([makeWork({ companyPricePln: 28 })], T2);
  // Without preserve: winner = staleNewer → MISSING. With merge preserve → CURRENT.
  const merged = mergeWorkCatalogStore(withRate, staleNewer);
  eq("T4 merge preserve ourRate", merged.catalogs.wroclaw.works[0].ourWorkRate?.ourRatePln, 70);
  eq("T4 merge keep companyPrice from winner", merged.catalogs.wroclaw.works[0].companyPricePln, 28);
  eq("T4 lookup CURRENT after merge", lookupWorkRate(merged, WORK_ID, UNIT, NOW).status, "CURRENT");
}

// ——— 5. preserve helper: target missing, donor has ———
{
  const target = makeStore([makeWork()], T2);
  let donor = makeStore([makeWork()], T1);
  donor = patchOurWorkRateInStore(donor, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 80,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T1,
    updatedAt: T1,
  }).store;
  const out = preserveOurWorkRatesFromDonor(target, donor);
  eq("T5 preserve copies 80", out.catalogs.wroclaw.works[0].ourWorkRate?.ourRatePln, 80);
  eq("T5 does not invent from companyPrice", out.catalogs.wroclaw.works[0].companyPricePln, 28);
}

// ——— 6. preserve does not overwrite existing OUR RATE ———
{
  let target = makeStore([makeWork()], T2);
  target = patchOurWorkRateInStore(target, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 90,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T2,
    updatedAt: T2,
  }).store;
  let donor = makeStore([makeWork()], T1);
  donor = patchOurWorkRateInStore(donor, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 40,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T1,
    updatedAt: T1,
  }).store;
  const out = preserveOurWorkRatesFromDonor(target, donor);
  eq("T6 keep target 90", out.catalogs.wroclaw.works[0].ourWorkRate?.ourRatePln, 90);
}

// ——— 7. stale companyPrice patch on in-memory snapshot + preserve from LS ———
{
  storage.clear();
  let live = makeStore([makeWork()], T1);
  live = patchOurWorkRateInStore(live, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 65,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T1,
    updatedAt: T1,
  }).store;
  saveWorkCatalogStoreLocal(live, { updatedAtIso: T1 });

  const staleReact = makeStore([makeWork({ companyPricePln: 28 })], T0);
  const companyPatched = patchWorkCompanyPriceInStore(staleReact, WORK_ID, 29, T2);
  ok("T7 company patch ok", companyPatched != null);
  // Simulate save-time preserve (same as saveWorkCatalogStore)
  const protectedStore = preserveOurWorkRatesFromDonor(
    normalizeWorkCatalogStore({ ...companyPatched, updatedAt: T2 }),
    loadWorkCatalogStoreLocal(),
  );
  saveWorkCatalogStoreLocal(protectedStore, { updatedAtIso: T2 });
  const after = loadWorkCatalogStoreLocal();
  eq("T7 companyPrice updated", after.catalogs.wroclaw.works[0].companyPricePln, 29);
  eq("T7 OUR RATE preserved", after.catalogs.wroclaw.works[0].ourWorkRate?.ourRatePln, 65);
  eq("T7 lookup CURRENT", lookupWorkRate(after, WORK_ID, UNIT, NOW).status, "CURRENT");
}

console.log(`\nWYNIK: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
