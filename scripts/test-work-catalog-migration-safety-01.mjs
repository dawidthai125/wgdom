/**
 * WORK-CATALOG-MIGRATION-SAFETY-01 — regression for destructive legacy overwrite.
 * npx vite-node scripts/test-work-catalog-migration-safety-01.mjs
 *
 * Does NOT hardcode production count 460. Authoritative = any non-`legacy-*` work id.
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-work-catalog-migration-safety";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-migration-safety";

import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import { applyGlobalCommercialMarginFloorToStore } from "../src/lib/price-intelligence/our-price-catalog.ts";
import { saveWorkCatalogRouted } from "../src/lib/catalog-write-router.ts";
import {
  decideWorkCatalogBootstrap,
  finalizeWorkCatalogAfterDeferredMerge,
} from "../src/lib/work-catalog-bootstrap.ts";
import {
  isAuthoritativeWorkCatalogStore,
  isDestructiveWorkCatalogReplace,
  isLegacySyntheticOnlyStore,
} from "../src/lib/work-catalog/work-catalog-authority.ts";
import { defaultWorkCatalogStore, migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  loadWorkCatalogStoreLocal,
  mergeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  WORK_CATALOG_META_KEY,
  normalizeWorkCatalogMeta,
} from "../src/lib/work-catalog/work-catalog-meta.ts";
import { WGDOM_COST_CATALOG_KEY } from "../src/lib/wgdom-cost-catalog-store.ts";

const EMPTY_TS = "2026-06-13T00:00:00.000Z";
const FULL_TS = "2026-08-13T19:03:25.349Z";
const LEGACY_NEWER_TS = "2026-08-14T07:38:52.991Z";
const CONTROL_ID = "cc-p0c-w1-zaprawianie-bruzd";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => {
    storage.set(key, String(value));
  },
  removeItem: (key) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
};

let cloudSnapshot = null;
let cloudMeta = normalizeWorkCatalogMeta(null);
const persistCalls = [];

globalThis.fetch = async (url, init) => {
  const urlStr = String(url);
  if (urlStr.includes("batch-get")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const keys = Array.isArray(body.keys) ? body.keys : [];
    return new Response(
      JSON.stringify({
        values: keys.map((key) => {
          if (key === WORK_CATALOG_STORAGE_KEY) return cloudSnapshot;
          if (key === WORK_CATALOG_META_KEY) return cloudMeta;
          return null;
        }),
      }),
      { status: 200 },
    );
  }
  if (urlStr.includes("batch-set") && init?.body) {
    try {
      const parsed = JSON.parse(String(init.body));
      persistCalls.push(parsed);
      if (parsed.workCatalogCas === true) {
        const idx = parsed.keys?.indexOf(WORK_CATALOG_STORAGE_KEY) ?? -1;
        if (idx >= 0) cloudSnapshot = parsed.values[idx];
        cloudMeta = {
          catalogRevision: (cloudMeta?.catalogRevision ?? 0) + 1,
          updatedAt: Date.now(),
        };
        return new Response(
          JSON.stringify({ ok: true, workCatalogMeta: cloudMeta }),
          { status: 200 },
        );
      }
    } catch {
      /* ignore */
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (!cond) {
    fail += 1;
    console.error(`FAIL ${msg}`);
    return;
  }
  pass += 1;
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    fail += 1;
    console.error(`FAIL ${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    return;
  }
  pass += 1;
}

function customWork(id, namePl = id) {
  return {
    id,
    tradeId: "PRZYGOTOWANIE",
    namePl,
    unit: "mb",
    companyPricePln: id === CONTROL_ID ? 35 : 12,
    updatedAt: FULL_TS,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

function fullCatalog(updatedAt = FULL_TS) {
  const base = defaultWorkCatalogStore(updatedAt);
  base.updatedAt = updatedAt;
  base.migratedFromLegacyAt = "2026-06-29T07:38:29.480Z";
  base.catalogs.wroclaw.works = [
    customWork(CONTROL_ID, "Zaprawianie / zamurowanie bruzd"),
    customWork("cc-p0c-w1-zabezpieczenie-folia", "Zabezpieczenie folią"),
    customWork("cc-custom-other", "Inna robota"),
  ];
  base.catalogs.wroclaw.updatedAt = updatedAt;
  return base;
}

function legacyOnlyCatalog(updatedAt = LEGACY_NEWER_TS) {
  const { store } = migrateLegacyCostCatalogStoreToWorkCatalog(defaultWgdomCostCatalogStore(), {
    migratedAtIso: updatedAt,
    nowMs: Date.parse(updatedAt),
  });
  return store;
}

function reset({ cloud = null, local = null, legacy = true } = {}) {
  storage.clear();
  persistCalls.length = 0;
  cloudSnapshot = cloud ? JSON.parse(JSON.stringify(cloud)) : null;
  if (legacy) {
    localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(defaultWgdomCostCatalogStore()));
  }
  if (local) {
    saveWorkCatalogStoreLocal(local, { updatedAtIso: local.updatedAt });
  }
}

function persistedWorkCatalogs() {
  return persistCalls.filter(
    (body) =>
      Array.isArray(body.keys)
      && body.keys.includes(WORK_CATALOG_STORAGE_KEY)
      && body.workCatalogCas === true,
  );
}

const empty = defaultWorkCatalogStore(EMPTY_TS);
const full = fullCatalog();
const legacy34 = legacyOnlyCatalog();

assert(isAuthoritativeWorkCatalogStore(full) === true, "full catalog is authoritative");
assert(isLegacySyntheticOnlyStore(legacy34) === true, "migrated catalog is legacy-synthetic-only");
assert(isLegacySyntheticOnlyStore(empty) === false, "empty is not synthetic-only");
assert(isDestructiveWorkCatalogReplace(legacy34, full) === true, "legacy over full is destructive");
assert(isDestructiveWorkCatalogReplace(empty, full) === true, "empty over full is destructive");
assert(isDestructiveWorkCatalogReplace(full, legacy34) === false, "full over legacy is not destructive");
assert(legacy34.catalogs.wroclaw.works.length > 1, "legacy fixture has multiple synthetic works");
assert(
  !legacy34.catalogs.wroclaw.works.some((w) => w.id === CONTROL_ID),
  "legacy fixture does not contain control work",
);

// SCENARIO 1 — cloud full, local empty, legacy fallback 34 → preserve cloud, no persist
reset({ cloud: full, local: empty });
const s1Decision = decideWorkCatalogBootstrap(
  defaultWgdomCostCatalogStore(),
  loadWorkCatalogStoreLocal(),
  cloudSnapshot,
);
assertEq(s1Decision.action, "skip", "S1 decide skip");
assertEq(s1Decision.reason, "cloud_catalog_present", "S1 reason cloud_catalog_present");
const s1Fin = await finalizeWorkCatalogAfterDeferredMerge({ cloud: cloudSnapshot });
assert(s1Fin.migrated === false, "S1 finalize not migrated");
assertEq(s1Fin.decision.reason, "cloud_catalog_present", "S1 finalize skip cloud");
assertEq(persistedWorkCatalogs().length, 0, "S1 no destructive persist");
const s1Merged = mergeWorkCatalogStore(empty, full);
assert(s1Merged.catalogs.wroclaw.works.some((w) => w.id === CONTROL_ID), "S1 merge keeps control");
assert(isAuthoritativeWorkCatalogStore(s1Merged), "S1 merge stays authoritative");
assertEq(loadWorkCatalogStoreLocal().catalogs.wroclaw.works.some((w) => w.id === CONTROL_ID), true, "S1 LS rehydrated from cloud");

// SCENARIO 2 — cloud full, local legacy-only 34 (newer updatedAt) → cloud preserved
reset({ cloud: full, local: legacy34 });
const s2Merged = mergeWorkCatalogStore(legacy34, full);
assert(s2Merged.catalogs.wroclaw.works.some((w) => w.id === CONTROL_ID), "S2 merge keeps control despite newer local");
assert(isLegacySyntheticOnlyStore(s2Merged) === false, "S2 merge is not synthetic-only");
const s2Fin = await finalizeWorkCatalogAfterDeferredMerge({ cloud: cloudSnapshot });
assert(s2Fin.migrated === false, "S2 finalize not migrated");
assertEq(persistedWorkCatalogs().length, 0, "S2 no destructive persist");
assertEq(loadWorkCatalogStoreLocal().catalogs.wroclaw.works.some((w) => w.id === CONTROL_ID), true, "S2 LS rehydrated to full");

const s2Save = await saveWorkCatalogRouted(legacy34, { updatedAtIso: "2026-08-14T12:00:00.000Z" });
assert(s2Save.ok === true && s2Save.saved === false && s2Save.blocked === "destructive_catalog_replace", "S2 persist of 34 blocked");
assertEq(persistedWorkCatalogs().length, 0, "S2 persistKey still empty after blocked save");

// SCENARIO 3 — cloud empty/nonexistent, local empty, legacy exists → migrate MAY proceed
reset({ cloud: null, local: empty });
const s3Decision = decideWorkCatalogBootstrap(
  defaultWgdomCostCatalogStore(),
  loadWorkCatalogStoreLocal(),
  null,
);
assertEq(s3Decision.action, "migrate", "S3 decide migrate");
const s3Fin = await finalizeWorkCatalogAfterDeferredMerge({ cloud: null });
assert(s3Fin.migrated === true, "S3 migrate proceeded");
assert(isLegacySyntheticOnlyStore(loadWorkCatalogStoreLocal()), "S3 local became legacy-synthetic");
assert(persistedWorkCatalogs().length > 0, "S3 persist allowed when cloud missing");

// SCENARIO 4 — cloud full + local full → normal LWW (additive / in-place update; no authoritative shrink)
const localNewerFull = fullCatalog("2026-08-14T09:00:00.000Z");
localNewerFull.catalogs.wroclaw.works.push(customWork("cc-custom-newer", "Nowsza robota"));
const control = localNewerFull.catalogs.wroclaw.works.find((w) => w.id === CONTROL_ID);
if (control) control.namePl = "Zaprawianie — zaktualizowane";
const s4Merged = mergeWorkCatalogStore(localNewerFull, full);
assertEq(s4Merged.updatedAt, "2026-08-14T09:00:00.000Z", "S4 newer full local wins LWW");
assert(s4Merged.catalogs.wroclaw.works.some((w) => w.id === "cc-custom-newer"), "S4 LWW payload from newer full");
assert(s4Merged.catalogs.wroclaw.works.some((w) => w.id === CONTROL_ID), "S4 control retained");
assert(s4Merged.catalogs.wroclaw.works.some((w) => w.id === "cc-custom-other"), "S4 no authoritative shrink on merge");

reset({ cloud: full, local: localNewerFull });
const s4Save = await saveWorkCatalogRouted(localNewerFull, { updatedAtIso: localNewerFull.updatedAt });
assert(s4Save.ok === true && s4Save.saved === true, "S4 authoritative additive save allowed");
assert(persistedWorkCatalogs().length > 0, "S4 safe CAS push for full catalog");

const localShrinkAttempt = fullCatalog("2026-08-14T09:30:00.000Z");
localShrinkAttempt.catalogs.wroclaw.works = localShrinkAttempt.catalogs.wroclaw.works.filter(
  (w) => w.id !== "cc-custom-other",
);
reset({ cloud: full, local: localShrinkAttempt });
persistCalls.length = 0;
const s4Shrink = await saveWorkCatalogRouted(localShrinkAttempt, {
  updatedAtIso: localShrinkAttempt.updatedAt,
});
assert(
  s4Shrink.ok === true && s4Shrink.saved === false && s4Shrink.blocked === "catalog_shrink_rejected",
  "S4 authoritative removal blocked without tombstone",
);
assertEq(persistedWorkCatalogs().length, 0, "S4 shrink attempt not pushed");

const cloudNewerFull = fullCatalog("2026-08-14T10:00:00.000Z");
const s4b = mergeWorkCatalogStore(full, cloudNewerFull);
assertEq(s4b.updatedAt, "2026-08-14T10:00:00.000Z", "S4 cloud newer full wins LWW");

// SCENARIO 5 — global labor margin against partial store MUST NOT persist
reset({ cloud: full, local: legacy34 });
const partialIds = legacy34.catalogs.wroclaw.works.filter((w) => w.active).map((w) => w.id);
const margined = applyGlobalCommercialMarginFloorToStore(
  legacy34,
  partialIds,
  0,
  "2026-08-14T12:30:00.000Z",
);
assert(margined !== legacy34, "S5 margin patch mutated partial store in memory");
persistCalls.length = 0;
const s5Save = await saveWorkCatalogRouted(margined, {
  updatedAtIso: "2026-08-14T12:30:00.000Z",
  previousStore: legacy34,
});
assert(s5Save.ok === true && s5Save.saved === false && s5Save.blocked === "destructive_catalog_replace", "S5 margin persist blocked");
assertEq(persistedWorkCatalogs().length, 0, "S5 no persistKey of partial+margin");
const s5Local = loadWorkCatalogStoreLocal();
assert(isLegacySyntheticOnlyStore(s5Local), "S5 LS not replaced by margined persist");
assert(s5Local.catalogs.wroclaw.works.every((w) => w.commercialPricing == null), "S5 no margin written to LS");

// C — local full + cloud 34 (newer) → keep local full
const sC = mergeWorkCatalogStore(full, legacy34);
assert(sC.catalogs.wroclaw.works.some((w) => w.id === CONTROL_ID), "C local full beats newer cloud 34");

// F — idempotent skip when already migrated locally and cloud empty
reset({ cloud: null, local: legacy34 });
const sF = await finalizeWorkCatalogAfterDeferredMerge({ cloud: null });
assert(sF.migrated === false, "F already_migrated skip");
assertEq(sF.decision.reason, "already_migrated", "F reason already_migrated");

console.log(`\nWORK-CATALOG-MIGRATION-SAFETY-01: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
