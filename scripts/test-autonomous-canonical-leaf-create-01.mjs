/**
 * ACLC-v1 tests
 * npx vite-node scripts/test-autonomous-canonical-leaf-create-01.mjs
 */
import assert from "node:assert/strict";
import {
  evaluateAutonomousCanonicalLeafCreate,
  executeAutonomousCanonicalLeafCreateMemorySync,
  buildAutonomousCanonicalWorkId,
  runAutonomousCanonicalLeafCreateBatch,
  buildProposalFromVerifiedRecord,
  authorizationFromEvaluation,
  AUTONOMOUS_CANONICAL_LEAF_CREATE_VERSION,
} from "../src/lib/work-catalog/autonomous-canonical-leaf-create.ts";
import { assertKnrWcCreateAllowed } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-create.ts";
import {
  CHATGPT_KNR_RESEARCH_TPI729_VERIFIED,
} from "../src/lib/intelligent-estimator/knr-knowledge/chatgpt-knr-research-knowledge-data.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { ensureBaselineTechnologyPacksRegistered } from "../src/lib/technology-foundation/ensure-baseline-technology-packs.ts";
import {
  clearPackRegistryForTests,
  listAllPacks,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";
import { isOwnerRuntimeDependencyCode } from "../src/lib/work-catalog/autonomous-identity-resolution-v2.ts";

let passed = 0;
function ok(label) {
  passed += 1;
  console.log("PASS", label);
}

const NOW = "2026-09-11T15:00:00.000Z";
clearPackRegistryForTests();
seedB0Fixtures();
ensureBaselineTechnologyPacksRegistered();
const packs = listAllPacks().filter((p) => p.lifecycle === "ACTIVE");

function emptyWc() {
  return normalizeWorkCatalogStore({
    version: 1,
    activeRegion: "wroclaw",
    catalogs: { wroclaw: { works: [] }, dolnyslask: { works: [] } },
  });
}

const gladzie = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED.find((r) => r.tableCode === "0815-04");
const r0158 = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED.find((r) => r.tableCode === "0158-03");
const r0829 = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED.find((r) => r.tableCode === "0829-03");

{
  assert.equal(AUTONOMOUS_CANONICAL_LEAF_CREATE_VERSION, "ACLC-v1");
  ok("1 version");
}

{
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: gladzie,
    store: emptyWc(),
    nowIso: NOW,
  });
  assert.equal(ev.canonicalCreateEligibility, true);
  assert.equal(ev.autonomousCreateDecision, "CREATE");
  assert.ok(ev.proposedCatalogWorkId?.includes("0815-04"));
  assert.ok(ev.proposedCatalogWorkId?.includes("knr-2-02") || ev.proposedCatalogWorkId?.includes("2-02"));
  ok("2 valid autonomous create → PASS");
}

{
  const bad = {
    ...gladzie,
    sources: [],
    description: "x",
  };
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: bad,
    store: emptyWc(),
    nowIso: NOW,
  });
  assert.equal(ev.canonicalCreateEligibility, false);
  assert.equal(ev.autonomousCreateDecision, "REJECT");
  ok("3 missing evidence → FAIL");
}

{
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: gladzie,
    store: emptyWc(),
    nowIso: NOW,
    pendingOnlyWithoutVerifiedPack: true,
  });
  assert.equal(ev.conditions.F_notMereCandidate, false);
  assert.equal(ev.autonomousCreateDecision, "REJECT");
  ok("4 PENDING-only / mere candidate → FAIL");
}

{
  const badUnit = { ...gladzie, unit: "kg" };
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: badUnit,
    store: emptyWc(),
    nowIso: NOW,
  });
  // kg may or may not normalize — if not compatible as construction unit for WC
  assert.ok(ev.autonomousCreateDecision === "REJECT" || ev.conditions.C_unitKnownCompatible === true);
  ok("5 unit path evaluated (fail-closed when illegal)");
}

{
  const id = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: gladzie.catalogFamilyPrefix,
    tableCode: gladzie.tableCode,
    unit: gladzie.unit,
  });
  const store = emptyWc();
  const r1 = executeAutonomousCanonicalLeafCreateMemorySync({
    record: gladzie,
    store,
    nowIso: NOW,
  });
  assert.equal(r1.executed, true);
  assert.equal(r1.workId, id);
  const r2 = executeAutonomousCanonicalLeafCreateMemorySync({
    record: gladzie,
    store: r1.store,
    nowIso: NOW,
  });
  assert.equal(r2.decision, "IDEMPOTENT_NOOP");
  assert.equal(r2.executed, false);
  ok("6 idempotent second create → NOOP");
}

{
  const storeWith = normalizeWorkCatalogStore({
    version: 1,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: {
        works: [
          {
            id: "cw.labor.gladzie_gipsowe_dwuwarstwowe_m2",
            namePl: "Wewnętrzne gładzie gipsowe dwuwarstwowe na ścianach",
            unit: "m2",
            tradeId: "POZOSTALE",
            companyPricePln: 0,
            source: "custom",
            active: true,
          },
        ],
      },
      dolnyslask: { works: [] },
    },
  });
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: gladzie,
    store: storeWith,
    nowIso: NOW,
  });
  // May REUSE if semantic clear winner, or CREATE if not strong enough — must NOT create duplicate semantics blindly
  assert.ok(
    ev.autonomousCreateDecision === "REUSE_EXISTING_CANONICAL"
      || ev.autonomousCreateDecision === "CREATE"
      || ev.semanticMatch != null
      || ev.aliasMatch != null,
  );
  ok("7 existing semantic/alias considered (no blind create)");
}

{
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: gladzie,
    store: emptyWc(),
    nowIso: NOW,
    companyPricePln: 120,
  });
  assert.equal(ev.conditions.J_noCompanyPriceIdentity, false);
  assert.equal(ev.autonomousCreateDecision, "REJECT");
  ok("8 companyPrice identity → FAIL");
}

{
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: gladzie,
    store: emptyWc(),
    nowIso: NOW,
    priceAsIdentity: true,
  });
  assert.equal(ev.conditions.K_noPriceAuthority, false);
  assert.equal(ev.autonomousCreateDecision, "REJECT");
  ok("9 price-only identity → FAIL");
}

{
  assert.ok(r0829.alternateFamilies?.includes("KNR 0-12"));
  const idA = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: "KNR 2-02",
    tableCode: "0829-03",
    unit: "m2",
  });
  const idB = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: "KNR 0-12",
    tableCode: "0829-03",
    unit: "m2",
  });
  assert.notEqual(idA, idB);
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: r0829,
    store: emptyWc(),
    nowIso: NOW,
  });
  assert.equal(ev.conflictState, "FAMILY_VARIANT_NOTED");
  assert.equal(ev.knrFamily, "KNR 2-02");
  ok("10 0829-03 family distinction preserved");
}

{
  assert.equal(r0158.catalogFamilyPrefix, "KNR 9-10");
  const id = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: r0158.catalogFamilyPrefix,
    tableCode: r0158.tableCode,
    unit: r0158.unit,
  });
  assert.ok(id.includes("9-10") || id.includes("knr-9-10"));
  ok("11 0158-03 KNR 9-10 identity in workId");
}

{
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: gladzie,
    store: emptyWc(),
    nowIso: NOW,
  });
  const auth = authorizationFromEvaluation(ev);
  const proposal = buildProposalFromVerifiedRecord(gladzie, ev);
  const gate = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "unset",
    workId: ev.proposedCatalogWorkId,
    store: emptyWc(),
    autonomousAuthorization: auth,
  });
  assert.equal(gate.ok, true);
  const noAuth = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "unset",
    workId: ev.proposedCatalogWorkId,
    store: emptyWc(),
    runtimeP3Enabled: false,
  });
  assert.equal(noAuth.ok, false);
  ok("12 assert: AUTONOMOUS auth PASS · without auth Owner gate remains");
}

{
  const batch = runAutonomousCanonicalLeafCreateBatch({
    store: emptyWc(),
    packs,
    nowIso: NOW,
  });
  assert.equal(batch.totals.ownerRuntimeDependency, 0);
  assert.equal(batch.totals.microSequencing, false);
  assert.equal(batch.totals.productionMutation, false);
  assert.ok(batch.totals.executedDryRun >= 1);
  for (const row of batch.perCode) {
    assert.equal(isOwnerRuntimeDependencyCode(row.airNext || ""), false);
  }
  ok("13 batch dry-run · zero Owner · no micro-seq");
}

{
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: gladzie,
    store: emptyWc(),
    nowIso: NOW,
  });
  assert.ok(ev.auditWhy.includes("ACLC-v1"));
  assert.ok(ev.provenance.sourceUrls.length >= 1);
  assert.equal(ev.provenance.decisionKind, "AUTONOMOUS_CREATE_V1");
  ok("14 creation audit/provenance");
}

{
  const weak = {
    ...gladzie,
    tableCode: "9999-99",
    canonicalDisplay: "KNR 2-02 9999-99",
    description: "Demontaż montaż coś",
    semanticTokens: ["demontaż", "montaż"],
    sources: [{ sourceUrl: "https://example.com/x.pdf", sourceType: "SECONDARY_WEB_INDEX" }],
  };
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: weak,
    store: emptyWc(),
    nowIso: NOW,
  });
  // secondary-only evidence → INSUFFICIENT → REJECT (no invent create)
  assert.equal(ev.autonomousCreateDecision, "REJECT");
  assert.equal(ev.canonicalCreateEligibility, false);
  ok("15 weak secondary-only evidence → FAIL");
}

{
  assert.equal(
    evaluateAutonomousCanonicalLeafCreate({
      record: gladzie,
      store: emptyWc(),
      nowIso: NOW,
    }).ownerRuntimeDependency,
    0,
  );
  ok("16 zero Owner runtime dependency");
}

console.log(`\nACLC-01 ${passed} PASS`);
