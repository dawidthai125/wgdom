/**
 * IK Autonomous Pricing Fallback — Slice 2
 *
 * catalogWorkId=null → legal research → PricingCandidate → EphemeralResearchBasis → Position Cost
 * ZERO CatalogWork CREATE · ZERO Accept · ZERO OUR RATE/KV · default HTTP=0
 *
 * Run: npx vite-node scripts/test-ik-autonomous-pricing-fallback-slice2.mjs
 */

import {
  apfDistinctIdentityKey,
  buildApfResearchQuery,
  buildPositionCostInputFromEphemeralBasis,
  computePositionCost,
  computeShadowPositionCostForOfferBoqLine,
  createFixtureApfLaborMarketPort,
  createPolicyDenyApfLaborMarketPort,
  pricingCandidateFromKnowledgeEvidenceOnly,
  resolveWorkIdentityFromOfferBoqLine,
  runAutonomousPricingFallback,
  validateEphemeralResearchBasis,
} from "../src/lib/tender-position-cost/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

let pass = 0;
let fail = 0;
let httpCalls = 0;

const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  httpCalls += 1;
  throw new Error(`UNEXPECTED_HTTP ${String(args[0])}`);
};

function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}

const emptyStore = normalizeWorkCatalogStore({ works: [] });
const NOW = "2026-08-27T09:00:00.000Z";
const NOW_MS = Date.parse(NOW);

function lineMiss(overrides = {}) {
  return {
    lineId: "L-1205-05",
    lp: "12",
    description: "Pomiar rezystancji izolacji — pierwsza",
    quantity: 1,
    unit: "prob",
    catalogWorkId: null,
    knrHint: "KNR 4-03 1205-05",
    ...overrides,
  };
}

function marketObs(partial = {}) {
  return {
    evidenceId: partial.evidenceId ?? "ev-market-1",
    unitRatePln: partial.unitRatePln ?? 45,
    unit: partial.unit ?? "prob",
    sourceId: partial.sourceId ?? "kb_pl",
    sourceUrl: partial.sourceUrl ?? null,
    observedAt: partial.observedAt ?? NOW,
    summaryPl: partial.summaryPl ?? "Fixture market labor (pomiar)",
    distinctKey: partial.distinctKey ?? "KNR|4-03|1205-05",
  };
}

function shadowLine(overrides = {}) {
  return {
    lineId: "L-1205-05",
    lp: "12",
    description: "Pomiar rezystancji izolacji — pierwsza",
    quantity: 1,
    quantityRaw: "1",
    unit: "prob",
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: "Pomiar rezystancji izolacji — pierwsza",
    aliasRuleId: null,
    knrHint: "KNR 4-03 1205-05",
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "?" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "?" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "?" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "test",
    aiConfidence: "low",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    ...overrides,
  };
}

console.log("\n=== T1: market labor → PricingCandidate ===");
{
  const r = await runAutonomousPricingFallback({
    tenderId: "T-S2",
    line: lineMiss(),
    laborMarketPort: createFixtureApfLaborMarketPort([
      marketObs({ evidenceId: "ev-m1", unitRatePln: 40 }),
      marketObs({ evidenceId: "ev-m2", unitRatePln: 50 }),
      marketObs({ evidenceId: "ev-m3", unitRatePln: 45 }),
    ]),
    nowIso: NOW,
  });
  eq("T1 status CANDIDATE", r.status, "CANDIDATE");
  ok("T1 candidate", r.candidate != null);
  ok(
    "T1 labor rate",
    Number.isFinite(r.candidate?.components?.labor?.unitRatePln),
    r.candidate?.components?.labor,
  );
  eq("T1 classification LABOR", r.candidate?.classificationHint, "LABOR");
  eq("T1 CREATE", r.counters.catalogWorkCreateCalls, 0);
  eq("T1 HTTP", r.counters.httpCalls, 0);
}

console.log("\n=== T2: KNR knowledge only → no labor PLN candidate ===");
{
  const r = await runAutonomousPricingFallback({
    tenderId: "T-S2",
    line: lineMiss(),
    nowIso: NOW,
  });
  eq("T2 HOLD", r.status, "HOLD");
  eq("T2 KNOWLEDGE_ONLY", r.holdCode, "KNOWLEDGE_ONLY");
  eq("T2 candidate null", r.candidate, null);
  ok(
    "T2 has KNR_DOC_FACT",
    r.evidence.some((e) => e.kind === "KNR_DOC_FACT"),
    r.evidence,
  );
  eq(
    "T2 knowledge helper null",
    pricingCandidateFromKnowledgeEvidenceOnly(
      r.evidence.map((e) => ({
        evidenceId: e.evidenceId,
        kind: e.kind,
        summaryPl: e.summaryPl,
        sourceId: e.sourceId,
        retrievedAt: e.retrievedAt,
      })),
    ),
    null,
  );
  eq("T2 HTTP", r.counters.httpCalls, 0);
}

console.log("\n=== T3: provenance + evidenceIds + confidence ===");
{
  const r = await runAutonomousPricingFallback({
    tenderId: "T-S2",
    line: lineMiss(),
    laborMarketPort: createFixtureApfLaborMarketPort([
      marketObs({ evidenceId: "ev-p1", unitRatePln: 42 }),
      marketObs({ evidenceId: "ev-p2", unitRatePln: 48 }),
    ]),
    nowIso: NOW,
  });
  const labor = r.candidate?.components?.labor;
  ok(
    "T3 evidenceIds",
    Array.isArray(labor?.evidenceIds) && labor.evidenceIds.length > 0,
  );
  ok(
    "T3 provenance evidenceIds",
    Array.isArray(r.candidate?.provenance?.evidenceIds) &&
      r.candidate.provenance.evidenceIds.length > 0,
  );
  ok(
    "T3 confidence",
    ["HIGH", "MEDIUM", "LOW"].includes(labor?.confidence),
    labor?.confidence,
  );
  ok("T3 builderVersion", !!r.candidate?.provenance?.builderVersion);
}

console.log("\n=== T4: no CatalogWork CREATE ===");
{
  const r = await runAutonomousPricingFallback({
    tenderId: "T-S2",
    line: lineMiss(),
    laborMarketPort: createFixtureApfLaborMarketPort([marketObs()]),
  });
  eq("T4 CREATE", r.counters.catalogWorkCreateCalls, 0);
  ok(
    "T4 no catalogWorkId on candidate",
    r.candidate &&
      !("catalogWorkId" in r.candidate) &&
      !("workId" in r.candidate),
  );
}

console.log("\n=== T5: policy deny → HTTP=0 / POLICY_DENY ===");
{
  const httpBefore = httpCalls;
  const r = await runAutonomousPricingFallback({
    tenderId: "T-S2",
    line: lineMiss(),
    laborMarketPort: createPolicyDenyApfLaborMarketPort("deny-fixture"),
  });
  eq("T5 HOLD", r.status, "HOLD");
  eq("T5 POLICY_DENY", r.holdCode, "POLICY_DENY");
  eq("T5 APF httpCalls", r.counters.httpCalls, 0);
  eq("T5 fetch HTTP", httpCalls, httpBefore);
}

console.log("\n=== T6: no evidence → HOLD ===");
{
  const r = await runAutonomousPricingFallback({
    tenderId: "T-S2",
    line: lineMiss({
      knrHint: null,
      description: "Linia bez KNR i bez rynku",
    }),
    laborMarketPort: createFixtureApfLaborMarketPort([]),
  });
  eq("T6 HOLD", r.status, "HOLD");
  ok(
    "T6 empty/no-sources family",
    r.holdCode === "EMPTY_EVIDENCE" ||
      r.holdCode === "NO_SOURCES" ||
      r.holdCode === "RESEARCH_NO_PRICE" ||
      r.holdCode === "KNOWLEDGE_ONLY",
    r.holdCode,
  );
  eq("T6 candidate null", r.candidate, null);
}

console.log("\n=== T7: 1205-05 vs 1205-06 distinct ===");
{
  const q05 = buildApfResearchQuery({
    tenderId: "T",
    line: lineMiss({
      lineId: "L-05",
      knrHint: "KNR 4-03 1205-05",
      description: "Pomiar pierwsza",
    }),
  });
  const q06 = buildApfResearchQuery({
    tenderId: "T",
    line: lineMiss({
      lineId: "L-06",
      knrHint: "KNR 4-03 1205-06",
      description: "Pomiar kolejna",
    }),
  });
  const k05 = apfDistinctIdentityKey(q05);
  const k06 = apfDistinctIdentityKey(q06);
  ok("T7 keys differ", k05 !== k06, { k05, k06 });
  ok("T7 has 1205-05", String(k05).includes("1205-05"), k05);
  ok("T7 has 1205-06", String(k06).includes("1205-06"), k06);
}

console.log("\n=== T8: 1305 remains separate (no fake WC) ===");
{
  const r = await runAutonomousPricingFallback({
    tenderId: "T-S2",
    line: lineMiss({
      lineId: "L-1305",
      knrHint: "KNR 4-03 1305-01",
      description: "Pozycja 1305 — nie wiąż APF z WC",
    }),
    laborMarketPort: createFixtureApfLaborMarketPort([
      marketObs({
        evidenceId: "ev-1305",
        distinctKey: "KNR|4-03|1305-01",
      }),
    ]),
  });
  ok(
    "T8 candidate or hold without inventing WC",
    r.status === "CANDIDATE" || r.status === "HOLD",
  );
  if (r.status === "CANDIDATE") {
    ok(
      "T8 no catalogWorkId",
      !("catalogWorkId" in r.candidate) && !("workId" in r.candidate),
    );
  }
  const id = resolveWorkIdentityFromOfferBoqLine(shadowLine({ catalogWorkId: null }));
  eq("T8 identity NO_IDENTITY without WC", id.status, "NO_IDENTITY");
}

console.log("\n=== T9: ephemeral → Position Cost engine ===");
{
  const r = await runAutonomousPricingFallback({
    tenderId: "T-S2",
    line: lineMiss({ quantity: 2 }),
    laborMarketPort: createFixtureApfLaborMarketPort([
      marketObs({ evidenceId: "ev-a", unitRatePln: 40 }),
      marketObs({ evidenceId: "ev-b", unitRatePln: 50 }),
    ]),
    nowIso: NOW,
  });
  eq("T9 APF CANDIDATE", r.status, "CANDIDATE");
  const v = validateEphemeralResearchBasis(r.ephemeralBasis, r.evidence);
  eq("T9 ephemeral ok", v.ok, true);

  const row = computeShadowPositionCostForOfferBoqLine({
    line: shadowLine({ quantity: 2, quantityRaw: "2" }),
    store: emptyStore,
    nowMs: NOW_MS,
    ephemeralCostBasis: r.ephemeralBasis,
  });
  ok("T9 engineInput", row.engineInput != null, row);
  ok("T9 position", row.position != null, row);
  eq("T9 costBasisKind", row.costBasisKind, "EPHEMERAL_RESEARCH");
  eq("T9 identity NO_IDENTITY", row.identity.status, "NO_IDENTITY");
  ok("T9 workId null", row.identity.workId == null);
  ok(
    "T9 positionComplete",
    row.position?.positionComplete === true,
    row.position,
  );

  const input = buildPositionCostInputFromEphemeralBasis({
    basis: r.ephemeralBasis,
    quantity: 2,
    unit: "prob",
  });
  ok("T9 direct input", input != null);
  if (input) {
    const cost = computePositionCost(input);
    ok(
      "T9 total finite",
      Number.isFinite(cost.totalPositionCostPln),
      cost,
    );
  }
}

console.log("\n=== T10: no KV/Accept + NO_IDENTITY without basis ===");
{
  const r = await runAutonomousPricingFallback({
    tenderId: "T-S2",
    line: lineMiss(),
    laborMarketPort: createFixtureApfLaborMarketPort([marketObs()]),
  });
  eq("T10 kvWriteCalls", r.counters.kvWriteCalls, 0);
  eq("T10 acceptCalls", r.counters.acceptCalls, 0);

  const row = computeShadowPositionCostForOfferBoqLine({
    line: shadowLine({ lineId: "L-no-basis" }),
    store: emptyStore,
    nowMs: NOW_MS,
  });
  eq("T10 no-basis NO_IDENTITY", row.identity.status, "NO_IDENTITY");
  ok(
    "T10 no-basis blocked",
    row.position == null || row.engineInput == null,
    row,
  );
}

console.log("\n=== DRY: 9 TRUE MISS (default ports, read-only) ===");
const dryLines = [
  ...[1, 2, 3].map((i) =>
    lineMiss({
      lineId: `DRY-1202-01-${i}`,
      knrHint: "KNR 4-03 1202-01",
      description: "Pomiar 1202-01",
    }),
  ),
  ...[1, 2, 3].map((i) =>
    lineMiss({
      lineId: `DRY-1205-05-${i}`,
      knrHint: "KNR 4-03 1205-05",
      description: "Pomiar 1205-05",
    }),
  ),
  ...[1, 2, 3].map((i) =>
    lineMiss({
      lineId: `DRY-1205-06-${i}`,
      knrHint: "KNR 4-03 1205-06",
      description: "Pomiar 1205-06",
    }),
  ),
];
const dry = [];
for (const line of dryLines) {
  const r = await runAutonomousPricingFallback({
    tenderId: "T-IK-REF-97-DRY",
    line,
  });
  dry.push({
    lineId: line.lineId,
    status: r.status,
    holdCode: r.status === "HOLD" ? r.holdCode : null,
    http: r.counters.httpCalls,
    create: r.counters.catalogWorkCreateCalls,
    kv: r.counters.kvWriteCalls,
    accept: r.counters.acceptCalls,
  });
}
console.log(JSON.stringify(dry, null, 2));
ok(
  "DRY no side effects",
  dry.every(
    (d) => d.create === 0 && d.kv === 0 && d.accept === 0 && d.http === 0,
  ),
  dry,
);
ok(
  "DRY honest HOLD/CANDIDATE",
  dry.every((d) => d.status === "HOLD" || d.status === "CANDIDATE"),
  dry,
);

globalThis.fetch = originalFetch;

console.log("\n========================================");
console.log(`PASS ${pass} / FAIL ${fail}`);
console.log(`HTTP=${httpCalls}`);
console.log("STOP after Slice 2.");
if (fail > 0) process.exit(1);
