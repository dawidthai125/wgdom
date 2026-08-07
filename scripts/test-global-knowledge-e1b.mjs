/**
 * GLOBAL-KNOWLEDGE-E1B — unit tests (DF + AR-C1/C2/C3).
 * npx vite-node scripts/test-global-knowledge-e1b.mjs
 */

import * as GK from "../src/lib/global-knowledge/index.ts";

const {
  applyCollisionPolicy,
  buildCanonicalGlobalId,
  commitControlledImport,
  createEmptyGlobalKnowledgeStore,
  forceGlobalKnowledgeE1bForTests,
  isGlobalKnowledgeE1bEnabled,
  isGlobalKnowledgeNoOp,
  isLifecycleUsableForIdentity,
  legalWipeGlobalKnowledgeEntries,
  loadGlobalKnowledgeStoreLocal,
  lookupByAlias,
  softDeleteGlobalKnowledgeEntry,
} = GK;

/** Minimal LS polyfill for Node harness (local-first path). */
if (typeof globalThis.localStorage === "undefined") {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => {
      mem.set(String(k), String(v));
    },
    removeItem: (k) => {
      mem.delete(String(k));
    },
    clear: () => mem.clear(),
  };
}

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${msg}`);
  }
}

console.log("=== GLOBAL-KNOWLEDGE-E1B ===\n");

forceGlobalKnowledgeE1bForTests(null);

console.log("1. Flag default OFF");
{
  assert(isGlobalKnowledgeE1bEnabled() === false, "default OFF");
  const store = createEmptyGlobalKnowledgeStore();
  const r = commitControlledImport(
    store,
    [
      {
        kind: "material",
        namePl: "Cement",
        aliases: ["cement portlandzki"],
        provenance: {
          originId: "manual_owner",
          licenceId: store.licences[0].licenceId,
          importedBy: "dawid",
          allowedUse: ["identity"],
        },
      },
    ],
    { importedBy: "dawid" },
  );
  assert(r.persisted === false, "OFF → no persist");
  assert(r.codes.includes("FLAG_OFF"), "FLAG_OFF code");
  assert(r.store.entries.length === 0, "store unchanged");
}

console.log("\n2. Legal Gate FIRST — scrape DENY (force harness)");
{
  forceGlobalKnowledgeE1bForTests(true);
  const store = createEmptyGlobalKnowledgeStore();
  const r = commitControlledImport(
    store,
    [
      {
        kind: "norm",
        namePl: "Scrape",
        provenance: {
          originId: "scrape_kb_pl",
          licenceId: store.licences[0].licenceId,
          importedBy: "dawid",
          allowedUse: ["identity"],
        },
      },
    ],
    { importedBy: "dawid", forcePersistForTests: true },
  );
  assert(r.persisted === false, "scrape no persist");
  assert(r.rejected === 1, "1 rejected");
  assert(r.results[0].codes.includes("ORIGIN_DENIED"), "ORIGIN_DENIED");
  assert(store.entries.length === 0, "original store empty");
}

console.log("\n3. Controlled import Owner + aliases + roundtrip");
{
  forceGlobalKnowledgeE1bForTests(true);
  const store = createEmptyGlobalKnowledgeStore();
  const r = commitControlledImport(
    store,
    [
      {
        kind: "material",
        namePl: "Cement portlandzki",
        unit: "kg",
        aliases: ["Cement Portlandzki", "cement"],
        provenance: {
          originId: "manual_owner",
          licenceId: store.licences[0].licenceId,
          importedBy: "dawid",
          allowedUse: ["lexicon", "identity"],
        },
      },
    ],
    { importedBy: "dawid", forcePersistForTests: true, nowIso: "2026-08-07T05:00:00.000Z" },
  );
  assert(r.persisted === true, "persisted");
  assert(r.inserted === 1, "inserted 1");
  assert(r.store.entries[0].aliases.includes("cement"), "alias folded");
  assert(r.store.schemaVersion === 1, "schemaVersion 1");
  const hit = lookupByAlias(r.store, "CEMENT");
  assert(hit != null && hit.namePl === "Cement portlandzki", "lookupByAlias");
  const loaded = loadGlobalKnowledgeStoreLocal();
  assert(loaded.entries.length === 1, "LS roundtrip entries");
  assert(lookupByAlias(loaded, "cement") != null, "LS alias lookup");
}

console.log("\n4. Collision Variant A");
{
  const base = {
    kind: "norm",
    namePl: "Roboty murowe",
    unit: "m2",
    normCode: "KNR 2-02-0111",
    revision: "1",
  };
  const id = buildCanonicalGlobalId(base);
  const store = createEmptyGlobalKnowledgeStore();
  const first = commitControlledImport(
    store,
    [
      {
        ...base,
        provenance: {
          originId: "manual_owner",
          licenceId: store.licences[0].licenceId,
          importedBy: "dawid",
          allowedUse: ["identity"],
        },
      },
    ],
    { importedBy: "dawid", forcePersistForTests: true },
  );
  assert(first.inserted === 1, "first insert");
  const noop = commitControlledImport(
    first.store,
    [
      {
        ...base,
        provenance: {
          originId: "manual_owner",
          licenceId: store.licences[0].licenceId,
          importedBy: "dawid",
          allowedUse: ["identity"],
        },
      },
    ],
    { importedBy: "dawid", forcePersistForTests: true },
  );
  assert(noop.noop === 1 && noop.inserted === 0, "idempotent noop");
  assert(noop.store.entries.length === 1, "still 1 entry");

  // divergent: same id formula but different name would change id — simulate policy unit
  const entryA = first.store.entries[0];
  const diverge = applyCollisionPolicy(entryA, {
    ...entryA,
    provenance: { ...entryA.provenance, contentHash: "deadbeefdeadbeef" },
  });
  assert(diverge.action === "reject", "divergent hash reject");
  assert(id.startsWith("gk_norm_"), "canonical id");
}

console.log("\n5. Reject prices / indicative_rate");
{
  const store = createEmptyGlobalKnowledgeStore();
  const badPrice = commitControlledImport(
    store,
    [
      {
        kind: "material",
        namePl: "X",
        provenance: {
          originId: "manual_owner",
          licenceId: store.licences[0].licenceId,
          importedBy: "dawid",
          allowedUse: ["identity"],
        },
        unitPricePln: 12,
      },
    ],
    { importedBy: "dawid", forcePersistForTests: true },
  );
  assert(badPrice.results[0].codes.includes("ENTRY_HAS_PRICE_FIELD"), "price reject");

  const badE7 = commitControlledImport(
    store,
    [
      {
        kind: "material",
        namePl: "Y",
        provenance: {
          originId: "manual_owner",
          licenceId: store.licences[0].licenceId,
          importedBy: "dawid",
          allowedUse: ["identity", "indicative_rate"],
        },
      },
    ],
    { importedBy: "dawid", forcePersistForTests: true },
  );
  assert(badE7.results[0].codes.includes("INDICATIVE_RATE_NOT_IN_E1A"), "E7 reject");
}

console.log("\n6. Soft delete + NO-OP usable");
{
  const store = createEmptyGlobalKnowledgeStore();
  const r = commitControlledImport(
    store,
    [
      {
        kind: "other",
        namePl: "Do usuniecia",
        provenance: {
          originId: "manual_owner",
          licenceId: store.licences[0].licenceId,
          importedBy: "dawid",
          allowedUse: ["identity"],
        },
      },
    ],
    { importedBy: "dawid", forcePersistForTests: true },
  );
  const id = r.store.entries[0].globalId;
  const del = softDeleteGlobalKnowledgeEntry(r.store, id, {
    actor: "dawid",
    forcePersistForTests: true,
  });
  assert(del.ok && del.persisted, "soft delete ok");
  assert(del.store.entries.length === 1, "row retained");
  assert(del.store.entries[0].lifecycle === "OBSOLETE", "OBSOLETE");
  assert(!isLifecycleUsableForIdentity(del.store.entries[0].lifecycle), "not usable");
  assert(isGlobalKnowledgeNoOp(del.store), "noop after soft delete");
  assert(lookupByAlias(del.store, "Do usuniecia") == null, "alias miss after delete");
}

console.log("\n7. Legal wipe");
{
  const store = createEmptyGlobalKnowledgeStore();
  const r = commitControlledImport(
    store,
    [
      {
        kind: "technology",
        namePl: "ETICS",
        provenance: {
          originId: "manual_owner",
          licenceId: store.licences[0].licenceId,
          importedBy: "dawid",
          allowedUse: ["identity"],
        },
      },
    ],
    { importedBy: "dawid", forcePersistForTests: true },
  );
  const noToken = legalWipeGlobalKnowledgeEntries(r.store, {
    confirmToken: "",
    actor: "dawid",
    notes: "cleanup",
    forcePersistForTests: true,
  });
  assert(!noToken.ok && noToken.codes.includes("MISSING_CONFIRM_TOKEN"), "wipe needs token");
  assert(noToken.store.entries.length === 1, "unchanged without token");

  const wiped = legalWipeGlobalKnowledgeEntries(r.store, {
    confirmToken: "WIPE-GLOBAL-KNOWLEDGE-E1B",
    actor: "dawid",
    notes: "legal cleanup test",
    forcePersistForTests: true,
  });
  assert(wiped.ok && wiped.persisted, "wipe ok");
  assert(wiped.store.entries.length === 0, "entries empty");
  assert(wiped.store.licences.length >= 1, "licences retained");
}

console.log("\n8. AR-C2 — saveLocal not on public index");
{
  assert(typeof GK.commitControlledImport === "function", "commit public");
  assert(typeof GK.softDeleteGlobalKnowledgeEntry === "function", "softDelete public");
  assert(typeof GK.legalWipeGlobalKnowledgeEntries === "function", "legalWipe public");
  assert(GK.persistGlobalKnowledgeStoreLocal === undefined, "persist not public");
  assert(GK.saveGlobalKnowledgeStoreLocal === undefined, "saveLocal not public");
}

console.log("\n9. Flag OFF blocks softDelete/wipe side-effect");
{
  forceGlobalKnowledgeE1bForTests(false);
  const store = createEmptyGlobalKnowledgeStore();
  // seed in-memory without persist path — use force then turn off
  forceGlobalKnowledgeE1bForTests(true);
  const seeded = commitControlledImport(
    store,
    [
      {
        kind: "other",
        namePl: "FlagOff",
        provenance: {
          originId: "manual_owner",
          licenceId: store.licences[0].licenceId,
          importedBy: "dawid",
          allowedUse: ["identity"],
        },
      },
    ],
    { importedBy: "dawid", forcePersistForTests: true },
  );
  forceGlobalKnowledgeE1bForTests(false);
  const del = softDeleteGlobalKnowledgeEntry(seeded.store, seeded.store.entries[0].globalId, {
    actor: "dawid",
  });
  assert(del.codes.includes("FLAG_OFF") && !del.persisted, "softDelete FLAG_OFF");
  const wipe = legalWipeGlobalKnowledgeEntries(seeded.store, {
    confirmToken: "x",
    actor: "dawid",
    notes: "n",
  });
  assert(wipe.codes.includes("FLAG_OFF") && !wipe.persisted, "wipe FLAG_OFF");
}

forceGlobalKnowledgeE1bForTests(null);

console.log(`\n=== WYNIK: ${pass} PASS · ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
