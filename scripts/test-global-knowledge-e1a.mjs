/**
 * GLOBAL-KNOWLEDGE-E1A — unit tests.
 * npx vite-node scripts/test-global-knowledge-e1a.mjs
 */

import {
  buildCanonicalGlobalId,
  canonicalizeNormCode,
  createEmptyGlobalKnowledgeStore,
  createOwnerManualLicence,
  evaluateLegalGate,
  isGlobalKnowledgeNoOp,
  isLifecycleUsableForIdentity,
  normalizeGlobalKnowledgeStore,
  validateGlobalKnowledgeImportCandidate,
  validateLifecycleFields,
} from "../src/lib/global-knowledge/index.ts";

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

console.log("=== GLOBAL-KNOWLEDGE-E1A ===\n");

console.log("1. Empty store = NO-OP");
{
  const empty = createEmptyGlobalKnowledgeStore();
  assert(empty.entries.length === 0, "0 entries");
  assert(isGlobalKnowledgeNoOp(empty), "isGlobalKnowledgeNoOp");
  assert(empty.licences.length === 1, "owner licence seeded");
  assert(empty.contentVersion.includes("empty"), "contentVersion empty marker");
}

console.log("\n2. Canonical ID + norm canon");
{
  assert(canonicalizeNormCode("knr  2-02-0111") === "KNR 2-02-0111", "norm canon");
  const id1 = buildCanonicalGlobalId({
    kind: "norm",
    namePl: "Roboty murowe",
    unit: "m2",
    normCode: "KNR 2-02-0111",
    revision: "1",
  });
  const id2 = buildCanonicalGlobalId({
    kind: "norm",
    namePl: "Roboty murowe",
    unit: "m2",
    normCode: "KNR 2-02-0111",
    revision: "1",
  });
  assert(id1 === id2, "deterministic GlobalId");
  assert(id1.startsWith("gk_norm_"), "prefix gk_norm_");
}

console.log("\n3. Legal Gate");
{
  const lic = createOwnerManualLicence();
  const ok = evaluateLegalGate(
    {
      licenceId: lic.licenceId,
      originId: "manual_owner",
      allowedUse: ["identity"],
      nowIso: "2026-08-07T00:00:00.000Z",
    },
    [lic],
  );
  assert(ok.ok, "owner manual PASS");

  const deny = evaluateLegalGate(
    {
      licenceId: lic.licenceId,
      originId: "scrape_kb_pl",
      allowedUse: ["identity"],
    },
    [lic],
  );
  assert(!deny.ok && deny.codes.includes("ORIGIN_DENIED"), "scrape DENIED");

  const noLic = evaluateLegalGate(
    { licenceId: "", originId: "manual_owner", allowedUse: ["identity"] },
    [lic],
  );
  assert(!noLic.ok && noLic.codes.includes("MISSING_LICENCE_ID"), "missing licence");
}

console.log("\n4. Lifecycle");
{
  assert(isLifecycleUsableForIdentity("ACTIVE"), "ACTIVE usable");
  assert(isLifecycleUsableForIdentity("DEPRECATED"), "DEPRECATED usable");
  assert(!isLifecycleUsableForIdentity("OBSOLETE"), "OBSOLETE not usable");
  const sup = validateLifecycleFields({ lifecycle: "SUPERSEDED", supersededBy: null });
  assert(!sup.ok && sup.codes.includes("SUPERSEDED_REQUIRES_TARGET"), "SUPERSEDED needs target");
}

console.log("\n5. Import validation (no write)");
{
  const store = createEmptyGlobalKnowledgeStore();
  const badPrice = validateGlobalKnowledgeImportCandidate(
    {
      kind: "norm",
      namePl: "X",
      provenance: {
        originId: "manual_owner",
        licenceId: store.licences[0].licenceId,
        importedBy: "dawid",
        allowedUse: ["identity"],
      },
      unitPricePln: 10,
    },
    store.licences,
  );
  assert(!badPrice.ok && badPrice.codes.includes("ENTRY_HAS_PRICE_FIELD"), "reject price field");

  const badE7 = validateGlobalKnowledgeImportCandidate(
    {
      kind: "norm",
      namePl: "Y",
      provenance: {
        originId: "manual_owner",
        licenceId: store.licences[0].licenceId,
        importedBy: "dawid",
        allowedUse: ["identity", "indicative_rate"],
      },
    },
    store.licences,
  );
  assert(!badE7.ok && badE7.codes.includes("INDICATIVE_RATE_NOT_IN_E1A"), "reject E7 use");

  const good = validateGlobalKnowledgeImportCandidate(
    {
      kind: "material",
      namePl: "Cement portlandzki",
      unit: "kg",
      provenance: {
        originId: "manual_owner",
        licenceId: store.licences[0].licenceId,
        importedBy: "dawid",
        allowedUse: ["lexicon"],
      },
    },
    store.licences,
  );
  assert(good.ok && good.entry?.globalId.startsWith("gk_material_"), "valid candidate builds entry");
  // store unchanged — validation only
  assert(store.entries.length === 0, "store still empty after validate");
}

console.log("\n6. Normalize garbage → empty");
{
  const n = normalizeGlobalKnowledgeStore(null);
  assert(isGlobalKnowledgeNoOp(n), "null → empty noop");
}

console.log(`\n=== WYNIK: ${pass} PASS · ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
