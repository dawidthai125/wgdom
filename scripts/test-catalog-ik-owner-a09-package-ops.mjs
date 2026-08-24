/**
 * IK-OWNER-A09-PACKAGE OPS — local idempotency + conflict tests (no KV).
 *
 * npx vite-node scripts/test-catalog-ik-owner-a09-package-ops.mjs
 */
import {
  IK_OWNER_A09_PACKAGE_OPS_REGIONS,
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
  applyA09PackageCatalogSeed,
  assertA09LaborHostUntouched,
  assertA09PackageNoConflictOrStop,
  buildIkOwnerCreateA09PackageCatalogWork,
  workMatchesOwnerApprovedA09PackageSpec,
} from "../src/lib/work-catalog/ik-owner-create-a09-package-ops.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";

const NOW = "2026-08-23T22:00:00.000Z";
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

function freshStore() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    updatedAt: NOW,
    catalogs: {
      wroclaw: { works: [], updatedAt: NOW },
      dolnyslask: { works: [], updatedAt: NOW },
    },
  });
}

// OPS-1 insert both regions
{
  const r1 = applyA09PackageCatalogSeed(freshStore(), NOW);
  ok("OPS-1 changed on empty store", r1.changed === true);
  ok(
    "OPS-1 wroclaw present",
    workMatchesOwnerApprovedA09PackageSpec(
      getWorkByIdFromStore(r1.store, IK_OWNER_CREATE_A09_PACKAGE_WORK_ID, "wroclaw"),
    ),
  );
  ok(
    "OPS-1 dolnyslask present",
    workMatchesOwnerApprovedA09PackageSpec(
      getWorkByIdFromStore(r1.store, IK_OWNER_CREATE_A09_PACKAGE_WORK_ID, "dolnyslask"),
    ),
  );
}

// OPS-2 idempotent re-run
{
  const s0 = freshStore();
  const r1 = applyA09PackageCatalogSeed(s0, NOW);
  const r2 = applyA09PackageCatalogSeed(r1.store, NOW);
  ok("OPS-2 idempotent no second change", r2.changed === false);
  ok("OPS-2 perRegion PRESENT_OK", r2.perRegion.wroclaw === "PRESENT_OK");
}

// OPS-3 conflict detection
{
  const store = freshStore();
  const bad = buildIkOwnerCreateA09PackageCatalogWork(NOW);
  bad.namePl = "Wrong name";
  store.catalogs.wroclaw.works = [bad];
  store.catalogs.dolnyslask.works = [{ ...bad }];
  let threw = false;
  try {
    applyA09PackageCatalogSeed(store, NOW);
  } catch (e) {
    threw = e.message.includes("CONFLICT");
  }
  ok("OPS-3 conflict stops seed", threw);
}

// OPS-4 helper statuses
{
  ok("OPS-4 absent", assertA09PackageNoConflictOrStop(null) === "ABSENT");
  ok(
    "OPS-4 present ok",
    assertA09PackageNoConflictOrStop(buildIkOwnerCreateA09PackageCatalogWork(NOW)) ===
      "PRESENT_OK",
  );
}

// OPS-5 draft — no rate 118 · no ourWorkRate
{
  const d = buildIkOwnerCreateA09PackageCatalogWork(NOW);
  ok(
    "OPS-5 draft fields",
    d.id === IK_OWNER_CREATE_A09_PACKAGE_WORK_ID &&
      d.unit === "m2" &&
      d.tradeId === "SCIANY_GK" &&
      d.companyPricePln === 0 &&
      d.freshnessStatus === "missing" &&
      d.ourWorkRate == null,
    d,
  );
  ok("OPS-5 not internalBase 118", d.companyPricePln !== 118);
}

// OPS-6 LABOR host untouched when present
{
  const store = freshStore();
  const host = {
    id: IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
    tradeId: "SCIANY_GK",
    namePl: "Zabudowa działowa z płyt gipsowo-kartonowych na stelażu",
    unit: "m2",
    companyPricePln: 118,
    updatedAt: NOW,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    ourWorkRate: { ourRatePln: 118, unit: "m2", updatedAt: NOW },
  };
  for (const region of IK_OWNER_A09_PACKAGE_OPS_REGIONS) {
    store.catalogs[region].works = [host];
  }
  const before = getWorkByIdFromStore(store, IK_OWNER_A09_REJECTED_LABOR_HOST_ID, "wroclaw");
  const r = applyA09PackageCatalogSeed(store, NOW);
  const after = getWorkByIdFromStore(r.store, IK_OWNER_A09_REJECTED_LABOR_HOST_ID, "wroclaw");
  ok("OPS-6 labor host untouched", assertA09LaborHostUntouched(before, after));
  ok(
    "OPS-6 new workId distinct",
    IK_OWNER_CREATE_A09_PACKAGE_WORK_ID !== IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  );
}

console.log(`\nA09-PACKAGE OPS TEST: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
