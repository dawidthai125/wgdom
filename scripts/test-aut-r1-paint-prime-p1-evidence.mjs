/**
 * P1 paint/prime Owner Evidence routes + host-lock (shared PDF) + register invariants.
 * Isolated — no cloud / no Catalog write.
 *
 * npx vite-node scripts/test-aut-r1-paint-prime-p1-evidence.mjs
 */
import assert from "node:assert/strict";
import {
  assertLaborSourceEvidenceHostLock,
  buildLaborSourceEvidenceObservation,
  listOwnerAuthorizedLaborEvidenceRoutesByUrl,
  resolveOwnerAuthorizedLaborEvidenceRoute,
  upsertLaborSourceEvidenceObservations,
  emptyLaborSourceEvidenceStore,
  saveLaborSourceEvidenceStoreLocal,
  clearLaborSourceEvidenceStoreLocalForTests,
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
} from "../src/lib/labor-source-evidence/index.ts";
import { evaluateAutR1LaborAcceptContract } from "../src/lib/work-catalog/aut-r1-accept-contract.ts";
import { buildCandidateFromDurableLaborEvidence } from "../src/lib/intelligent-estimator/apf-labor-evidence-persist.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  MOPS_08DEF932_LABOR_GAP_ROWS,
  summarizeMops08LaborGapResearch,
} from "../src/lib/intelligent-estimator/knr-knowledge/mops-08def932-painting-priming-labor-research-v1.ts";

let passed = 0;
function ok(label) {
  passed += 1;
  console.log("PASS", label);
}

const NOW = "2026-09-13T17:00:00.000Z";
const NOW_MS = Date.parse(NOW);

const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: (k) => ls.delete(k),
  clear: () => ls.clear(),
  key: (i) => [...ls.keys()][i] ?? null,
  get length() {
    return ls.size;
  },
};

const ROUTES = [
  {
    sourceId: "zsckr_bozkow_1204_02",
    workId: "cw.knr.knr-4-01.1204-02.m2",
    pricePoint: 3.721,
    expectedOur: 3.72,
  },
  {
    sourceId: "hbstudio_cypisek_1505_01",
    workId: "cw.knr.knr-2-02.1505-01.m2",
    pricePoint: 1.182,
    expectedOur: 1.18,
  },
  {
    sourceId: "lok_lukow_1134_01",
    workId: "cw.knr.nnrnkb.1134-01.m2",
    pricePoint: 1.044,
    expectedOur: 1.04,
  },
  {
    sourceId: "lok_lukow_1134_02",
    workId: "cw.knr.nnrnkb.1134-02.m2",
    pricePoint: 1.392,
    expectedOur: 1.39,
  },
];

for (const r of ROUTES) {
  const route = resolveOwnerAuthorizedLaborEvidenceRoute(r.sourceId);
  assert.ok(route, r.sourceId);
  assert.equal(route.workId, r.workId);
  const host = assertLaborSourceEvidenceHostLock({
    sourceId: r.sourceId,
    sourceUrl: route.url,
  });
  assert.equal(host.ok, true, r.sourceId);
}
ok("1 Owner routes ×4 + host-lock PASS");

{
  const url =
    "https://www.lok.lukow.pl/pobierz/article-d235da9c67851a0efa42a4993de09cb7";
  const both = listOwnerAuthorizedLaborEvidenceRoutesByUrl(url);
  assert.equal(both.length, 2);
  assert.ok(both.some((x) => x.sourceId === "lok_lukow_1134_01"));
  assert.ok(both.some((x) => x.sourceId === "lok_lukow_1134_02"));
  const h1 = assertLaborSourceEvidenceHostLock({
    sourceId: "lok_lukow_1134_01",
    sourceUrl: url,
  });
  const h2 = assertLaborSourceEvidenceHostLock({
    sourceId: "lok_lukow_1134_02",
    sourceUrl: url,
  });
  assert.equal(h1.ok, true);
  assert.equal(h2.ok, true);
  ok("2 shared LOK URL host-lock for both 1134 leaves");
}

{
  const wild = assertLaborSourceEvidenceHostLock({
    sourceId: "zsckr_bozkow_1204_02",
    sourceUrl: "https://zsckrbozkow.pl/wp-content/uploads/2025/05/other.pdf",
  });
  assert.equal(wild.ok, false);
  ok("3 no wildcard host authorization");
}

clearLaborSourceEvidenceStoreLocalForTests();
saveLaborSourceEvidenceStoreLocal(emptyLaborSourceEvidenceStore(NOW));

const observations = [];
for (const r of ROUTES) {
  const route = resolveOwnerAuthorizedLaborEvidenceRoute(r.sourceId);
  const obs = buildLaborSourceEvidenceObservation({
    workId: r.workId,
    workNamePl: r.workId,
    sourceId: r.sourceId,
    sourceUrl: route.url,
    categoryKey: `test_p1_${r.sourceId}`,
    observedName: `test ${r.workId}`,
    unit: "m2",
    pricePoint: r.pricePoint,
    priceKind: "point",
    region: "POLSKA",
    identityMatched: true,
    identityMethod: "exact_name",
    laborOnly: true,
    includesMaterial: false,
    observedAt: NOW,
    retrievedAt: NOW,
  });
  assert.equal(obs.qualityStatus, "VALID");
  assert.equal(obs.pricePoint, r.pricePoint);
  assert.equal(obs.laborOnly, true);
  assert.equal(obs.includesMaterial, false);
  observations.push(obs);
}
const upsert = upsertLaborSourceEvidenceObservations({
  observations,
  nowIso: NOW,
});
assert.equal(upsert.ok, true, upsert.messagePl);
ok("4 Evidence ingest VALID ×4 (exact pricePoints)");

{
  // Minimal store with four works · MISSING rates
  const works = ROUTES.map((r) => ({
    id: r.workId,
    namePl: r.workId,
    unit: "m2",
    tradeId: "malowanie",
    active: true,
  }));
  const store = normalizeWorkCatalogStore({
    version: 1,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { works },
      dolnyslask: { works: [] },
    },
  });

  for (let i = 0; i < ROUTES.length; i += 1) {
    const r = ROUTES[i];
    const obs = observations[i];
    const candidate = buildCandidateFromDurableLaborEvidence({
      workId: r.workId,
      workNamePl: r.workId,
      unit: "m2",
      observations: [obs],
    });
    assert.ok(candidate);
    assert.equal(candidate.marketBaseRatePln, r.expectedOur);
    const contract = evaluateAutR1LaborAcceptContract({
      store,
      candidate,
      identityTrusted: true,
      evidenceObservations: [obs],
      nowMs: NOW_MS,
    });
    assert.equal(contract.decision, "AUT_R1_ACCEPT", r.sourceId + " " + contract.reasons);
    assert.equal(contract.mayPersistOurRate, true);
    assert.equal(contract.marketBaseRatePln, r.expectedOur);
  }
  ok("5 AUT-R1 ACCEPT ×4 · marketBase = canonical 2-dp of source R");
}

{
  const row1204 = MOPS_08DEF932_LABOR_GAP_ROWS.find((x) => x.tableCode === "1204-02");
  assert.equal(row1204?.status, "AUT_R1_CURRENT");
  assert.equal(row1204?.researchPlnCandidate, 3.721);
  assert.equal(row1204?.autR1SufficientPlnEvidence, true);
  const rowMycie = MOPS_08DEF932_LABOR_GAP_ROWS.find((x) => x.tableCode === "1014-07");
  assert.equal(rowMycie?.status, "EVIDENCE_ONLY_HOLD");
  const sum = summarizeMops08LaborGapResearch();
  assert.equal(sum.autR1Current, 4);
  assert.equal(sum.autR1Blocked, 0);
  ok("6 research register AUT_R1_CURRENT ×4 · P0 1014 still HOLD");
}

{
  // Forbidden: r-g observation must not be treated as PLN point for ingest contract
  // (we only assert our fixtures use PLN pricePoints, not r-g)
  assert.ok(observations.every((o) => o.pricePoint > 1 || o.pricePoint === 1.044 || o.pricePoint === 1.182 || o.pricePoint === 1.392 || o.pricePoint === 3.721));
  assert.ok(!observations.some((o) => o.pricePoint < 0.2)); // would look like r-g norm
  ok("7 no r-g-norm-shaped pricePoints in fixtures");
}

void LABOR_SOURCE_EVIDENCE_STORAGE_KEY;
console.log(`\nOK ${passed} assertions`);
