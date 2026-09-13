/**
 * MOPS 08def932 painting/priming ACLC identity + research register.
 * No AUT-R1 invent · no r-g→PLN · no contamination of 0815-05 / legacy-malowanie rates.
 *
 * npx vite-node scripts/test-mops-08def932-painting-priming-aclc-v1.mjs
 */
import assert from "node:assert/strict";
import {
  evaluateAutonomousCanonicalLeafCreate,
  executeAutonomousCanonicalLeafCreateMemorySync,
  buildAutonomousCanonicalWorkId,
  authorizationFromEvaluation,
  buildProposalFromVerifiedRecord,
} from "../src/lib/work-catalog/autonomous-canonical-leaf-create.ts";
import { assertKnrWcCreateAllowed } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-create.ts";
import { CHATGPT_KNR_RESEARCH_TPI729_VERIFIED } from "../src/lib/intelligent-estimator/knr-knowledge/chatgpt-knr-research-knowledge-data.ts";
import {
  MOPS_08DEF932_LABOR_GAP_HARD_RULES,
  MOPS_08DEF932_LABOR_GAP_ROWS,
  MOPS_08DEF932_LABOR_GAP_RESEARCH_VERSION,
  summarizeMops08LaborGapResearch,
} from "../src/lib/intelligent-estimator/knr-knowledge/mops-08def932-painting-priming-labor-research-v1.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/work-rate-lookup.ts";

let passed = 0;
function ok(label) {
  passed += 1;
  console.log("PASS", label);
}

const NOW = "2026-09-13T16:00:00.000Z";
const NOW_MS = Date.parse(NOW);

function emptyWc() {
  return normalizeWorkCatalogStore({
    version: 1,
    activeRegion: "wroclaw",
    catalogs: { wroclaw: { works: [] }, dolnyslask: { works: [] } },
  });
}

assert.equal(
  MOPS_08DEF932_LABOR_GAP_RESEARCH_VERSION,
  "MOPS-08DEF932-LABOR-GAP-V1",
);
ok("1 research version");

assert.ok(MOPS_08DEF932_LABOR_GAP_HARD_RULES.some((r) => /r-g/i.test(r)));
ok("2 hard rule blocks r-g→OUR RATE");

const codes = ["1204-02", "1505-01", "1134-01", "1134-02"];
const records = codes.map((c) => {
  const r = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED.find((x) => x.tableCode === c);
  assert.ok(r, `missing CKRK ${c}`);
  return r;
});
ok("3 CKRK records present for A+B");

{
  const id1204 = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: "KNR 4-01",
    tableCode: "1204-02",
    unit: "m2",
  });
  const id1505 = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: "KNR 2-02",
    tableCode: "1505-01",
    unit: "m2",
  });
  assert.equal(id1204, "cw.knr.knr-4-01.1204-02.m2");
  assert.equal(id1505, "cw.knr.knr-2-02.1505-01.m2");
  assert.notEqual(id1204, id1505);
  ok("4 separate leaf ids walls vs ceilings");
}

{
  const id01 = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: "NNRNKB",
    tableCode: "1134-01",
    unit: "m2",
  });
  const id02 = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: "NNRNKB",
    tableCode: "1134-02",
    unit: "m2",
  });
  assert.equal(id01, "cw.knr.nnrnkb.1134-01.m2");
  assert.equal(id02, "cw.knr.nnrnkb.1134-02.m2");
  ok("5 NNRNKB priming leaf ids");
}

let store = emptyWc();
for (const rec of records) {
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: rec,
    store,
    nowIso: NOW,
  });
  assert.equal(ev.canonicalCreateEligibility, true, rec.tableCode);
  assert.equal(ev.autonomousCreateDecision, "CREATE", rec.tableCode);
  assert.equal(ev.evidenceQuality !== "INSUFFICIENT", true, rec.tableCode);
  const proposal = buildProposalFromVerifiedRecord(rec, ev);
  const auth = authorizationFromEvaluation(ev);
  assertKnrWcCreateAllowed({
    proposal,
    store,
    autonomousAuthorization: auth,
  });
  const exec = executeAutonomousCanonicalLeafCreateMemorySync({
    record: rec,
    store,
    nowIso: NOW,
  });
  assert.equal(exec.decision, "CREATE", rec.tableCode);
  store = exec.store;
}
ok("6 ACLC CREATE ×4 memory sync");

{
  const leafIds = [
    "cw.knr.knr-4-01.1204-02.m2",
    "cw.knr.knr-2-02.1505-01.m2",
    "cw.knr.nnrnkb.1134-01.m2",
    "cw.knr.nnrnkb.1134-02.m2",
  ];
  for (const id of leafIds) {
    const w = getWorkByIdFromStore(store, id);
    assert.ok(w, id);
    const lookup = lookupWorkRate(store, id, "m2", NOW_MS);
    assert.notEqual(lookup.status, "CURRENT", id);
    assert.ok(!(Number(lookup.ourRatePln) > 0), `no invent rate ${id}`);
  }
  ok("7 leaves exist · OUR RATE not CURRENT (no invent)");
}

{
  // Regression: known leaf rates must not appear on new paint/prime leaves
  const paint = getWorkByIdFromStore(store, "cw.knr.knr-4-01.1204-02.m2");
  assert.notEqual(paint?.ourWorkRate?.ourRatePln, 22.88);
  assert.notEqual(paint?.ourWorkRate?.ourRatePln, 22.9);
  assert.notEqual(paint?.ourWorkRate?.ourRatePln, 13.15);
  ok("8 no contamination from 0815-05 / malowanie / 0815-04 rates");
}

{
  const row1204 = MOPS_08DEF932_LABOR_GAP_ROWS.find((r) => r.tableCode === "1204-02");
  assert.equal(row1204?.autR1SufficientPlnEvidence, false);
  assert.equal(row1204?.researchPlnCandidate, 3.721);
  assert.equal(row1204?.status, "AUT_R1_BLOCKED_NO_PLN_ROUTE");
  const rowMycie = MOPS_08DEF932_LABOR_GAP_ROWS.find((r) => r.tableCode === "1014-07");
  assert.equal(rowMycie?.status, "EVIDENCE_ONLY_HOLD");
  const row0909 = MOPS_08DEF932_LABOR_GAP_ROWS.find((r) => r.tableCode === "0909-04");
  assert.equal(row0909?.status, "OWNER_DECISION");
  const rowWykwity = MOPS_08DEF932_LABOR_GAP_ROWS.find((r) => r.group === "J");
  assert.equal(rowWykwity?.status, "OWNER_DECISION");
  ok("9 research register holds AUT-R1 / Owner / mycie");
}

{
  const sum = summarizeMops08LaborGapResearch();
  assert.ok(sum.autR1Blocked >= 4);
  assert.ok(sum.ownerDecision >= 2);
  assert.ok(sum.bomRequired >= 2);
  ok("10 summary counters");
}

{
  // Cross-code REUSE forbidden: 1204 must not collapse into 1505
  const r1204 = records.find((r) => r.tableCode === "1204-02");
  const storeWith1505 = executeAutonomousCanonicalLeafCreateMemorySync({
    record: records.find((r) => r.tableCode === "1505-01"),
    store: emptyWc(),
    nowIso: NOW,
  }).store;
  const ev = evaluateAutonomousCanonicalLeafCreate({
    record: r1204,
    store: storeWith1505,
    nowIso: NOW,
  });
  assert.equal(ev.autonomousCreateDecision, "CREATE");
  assert.notEqual(
    ev.proposedCatalogWorkId,
    "cw.knr.knr-2-02.1505-01.m2",
  );
  ok("11 ACLC refuses semantic collapse 1204→1505");
}

console.log(`\nOK ${passed} assertions`);
