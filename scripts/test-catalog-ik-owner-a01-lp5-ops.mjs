/**
 * IK-OWNER-A01-LP5 OPS — local idempotency + conflict tests (no KV).
 *
 * npx vite-node scripts/test-catalog-ik-owner-a01-lp5-ops.mjs
 */
import {
  IK_OWNER_CREATE_A01_LP5_WORK_ID,
  assertA01Lp5NoConflictOrStop,
  applyA01Lp5CatalogSeed,
  buildIkOwnerCreateA01Lp5CatalogWork,
  workMatchesOwnerApprovedA01Lp5Spec,
} from "../src/lib/work-catalog/ik-owner-create-a01-lp5-ops.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";

const NOW = "2026-08-23T20:30:00.000Z";
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
  const r1 = applyA01Lp5CatalogSeed(freshStore(), NOW);
  ok("OPS-1 changed on empty store", r1.changed === true);
  ok(
    "OPS-1 wroclaw present",
    workMatchesOwnerApprovedA01Lp5Spec(getWorkByIdFromStore(r1.store, IK_OWNER_CREATE_A01_LP5_WORK_ID, "wroclaw")),
  );
  ok(
    "OPS-1 dolnyslask present",
    workMatchesOwnerApprovedA01Lp5Spec(getWorkByIdFromStore(r1.store, IK_OWNER_CREATE_A01_LP5_WORK_ID, "dolnyslask")),
  );
}

// OPS-2 idempotent re-run
{
  const s0 = freshStore();
  const r1 = applyA01Lp5CatalogSeed(s0, NOW);
  const r2 = applyA01Lp5CatalogSeed(r1.store, NOW);
  ok("OPS-2 idempotent no second change", r2.changed === false);
  ok("OPS-2 perRegion PRESENT_OK", r2.perRegion.wroclaw === "PRESENT_OK");
}

// OPS-3 conflict detection
{
  const store = freshStore();
  const bad = buildIkOwnerCreateA01Lp5CatalogWork(NOW);
  bad.namePl = "Wrong name";
  store.catalogs.wroclaw.works = [bad];
  store.catalogs.dolnyslask.works = [{ ...bad }];
  let threw = false;
  try {
    applyA01Lp5CatalogSeed(store, NOW);
  } catch (e) {
    threw = e.message.includes("CONFLICT");
  }
  ok("OPS-3 conflict stops seed", threw);
}

// OPS-4 assertNoConflictOrStop helper
{
  ok("OPS-4 absent", assertA01Lp5NoConflictOrStop(null) === "ABSENT");
  ok(
    "OPS-4 present ok",
    assertA01Lp5NoConflictOrStop(buildIkOwnerCreateA01Lp5CatalogWork(NOW)) === "PRESENT_OK",
  );
}

// OPS-5 draft matches Owner spec
{
  const d = buildIkOwnerCreateA01Lp5CatalogWork(NOW);
  ok(
    "OPS-5 draft fields",
    d.id === IK_OWNER_CREATE_A01_LP5_WORK_ID &&
      d.namePl === "Impregnacja biobójcza ręczna" &&
      d.unit === "m2" &&
      d.tradeId === "PRZYGOTOWANIE",
    d,
  );
}

console.log(`\nA01-LP5 OPS TEST: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
