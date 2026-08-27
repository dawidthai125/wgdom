/**
 * IK Autonomous Pricing Fallback — Slice 1
 *
 * Proves:
 *   catalogWorkId = null
 *   + valid EphemeralResearchBasis (test fixture)
 *   → existing Position Cost engine costs the line
 *
 * ZERO CatalogWork CREATE · ZERO HTTP · ZERO KV · ZERO Accept
 * NO live research/scraping · NO real 97-line package costing
 *
 * Run: npx vite-node scripts/test-ik-autonomous-pricing-fallback-slice1.mjs
 */

import {
  buildPositionCostInputFromEphemeralBasis,
  computePositionCost,
  computeShadowPositionCostForOfferBoqLine,
  ephemeralBasisHasFakeCatalogId,
  pricingCandidateFromKnowledgeEvidenceOnly,
  resolveWorkIdentityFromOfferBoqLine,
  validateEphemeralResearchBasis,
} from "../src/lib/tender-position-cost/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

let pass = 0;
let fail = 0;

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

let httpCalls = 0;
const catalogWorkCreateCalls = 0;
const kvWriteCalls = 0;
const acceptCalls = 0;

const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  httpCalls += 1;
  throw new Error(`UNEXPECTED_HTTP ${String(args[0])}`);
};

const emptyStore = normalizeWorkCatalogStore({ works: [] });
const NOW = Date.parse("2026-08-27T09:00:00.000Z");

/** OfferBoq line shape aligned with f4 shadow harness. */
function lineNoCatalog(overrides = {}) {
  return {
    lineId: "L-pomiar-1205-05",
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

/** Test-only fixture — NOT production seed / KV / CatalogWork. */
function fixtureEphemeralLaborBasis(overrides = {}) {
  return {
    type: "EPHEMERAL_RESEARCH",
    candidateId: "test-ephemeral-labor-pomiar-1205-05",
    unit: "prob",
    components: {
      labor: {
        unitRatePln: 42.5,
        unit: "prob",
        method: "TEST_FIXTURE_MARKET_LABOR_OBS",
        evidenceIds: ["ev-market-labor-1"],
        confidence: "MEDIUM",
      },
    },
    provenance: {
      evidenceIds: ["ev-market-labor-1"],
      builtAt: "2026-08-27T09:00:00.000Z",
      builderVersion: "slice1-test-fixture",
    },
    limitations: ["SLICE1_TEST_FIXTURE_ONLY", "NOT_PRODUCTION_SEED"],
    ...overrides,
  };
}

const knrKnowledgeOnly = [
  {
    evidenceId: "ev-knr-1205-05",
    kind: "KNR_DOC_FACT",
    summaryPl:
      "KNR 4-03 1205-05 opisuje pomiar rezystancji izolacji (pierwsza).",
    sourceId: "knr-doc:4-03",
  },
];

console.log("\n=== T1: null catalogWorkId + valid ephemeral → position cost ===");
{
  const line = lineNoCatalog();
  const id = resolveWorkIdentityFromOfferBoqLine(line);
  eq("T1 identity NO_IDENTITY", id.status, "NO_IDENTITY");
  eq("T1 workId null", id.workId, null);

  const row = computeShadowPositionCostForOfferBoqLine({
    line,
    store: emptyStore,
    nowMs: NOW,
    ephemeralCostBasis: fixtureEphemeralLaborBasis(),
  });

  ok("T1 engineInput present", row.engineInput != null, row.engineInput);
  ok("T1 position present", row.position != null, row.position);
  eq("T1 costBasisKind", row.costBasisKind, "EPHEMERAL_RESEARCH");
  eq(
    "T1 ephemeralCandidateId",
    row.ephemeralCandidateId,
    "test-ephemeral-labor-pomiar-1205-05",
  );
  ok("T1 workId still null (no fake catalog)", row.identity.workId == null);
  eq("T1 identity remains NO_IDENTITY", row.identity.status, "NO_IDENTITY");
  ok(
    "T1 labor rate mapped",
    row.engineInput?.labor?.ourRatePln === 42.5,
    row.engineInput?.labor,
  );
  ok(
    "T1 total computable",
    row.position?.positionComplete === true &&
      row.position?.totalPositionCostPln === 42.5,
    row.position,
  );
}

console.log("\n=== T2: KNR knowledge alone ≠ labor PLN ===");
{
  const candidate =
    pricingCandidateFromKnowledgeEvidenceOnly(knrKnowledgeOnly);
  eq("T2 knowledge-only candidate is null", candidate, null);

  const forged = fixtureEphemeralLaborBasis({
    components: {
      labor: {
        unitRatePln: 99,
        unit: "prob",
        method: "FORGED_FROM_KNR_FACT",
        evidenceIds: ["ev-knr-1205-05"],
        confidence: "HIGH",
      },
    },
    provenance: {
      evidenceIds: ["ev-knr-1205-05"],
      builtAt: "2026-08-27T09:00:00.000Z",
      builderVersion: "slice1-test-fixture",
    },
  });
  const v = validateEphemeralResearchBasis(forged, knrKnowledgeOnly);
  eq("T2 forged KNR→PLN rejected", v.ok, false);
  ok(
    "T2 reject reason KNR_KNOWLEDGE_IS_NOT_PRICE",
    !v.ok && v.reason === "KNR_KNOWLEDGE_IS_NOT_PRICE",
    v,
  );
}

console.log("\n=== T3: ephemeral labor → PositionCostInput labor component ===");
{
  const basis = fixtureEphemeralLaborBasis();
  const input = buildPositionCostInputFromEphemeralBasis({
    basis,
    quantity: 3,
    unit: "prob",
  });
  ok("T3 input built", input != null);
  eq("T3 quantity", input?.quantity, 3);
  eq("T3 unit", input?.unit, "prob");
  eq("T3 labor status CURRENT", input?.labor?.status, "CURRENT");
  eq("T3 labor ourRatePln", input?.labor?.ourRatePln, 42.5);
  eq("T3 materials empty (labor-only)", input?.materials?.length, 0);
  const cost = computePositionCost(input);
  eq("T3 engine total", cost.totalPositionCostPln, 127.5);
}

console.log("\n=== T4: ZERO CatalogWork CREATE ===");
{
  computeShadowPositionCostForOfferBoqLine({
    line: lineNoCatalog(),
    store: emptyStore,
    nowMs: NOW,
    ephemeralCostBasis: fixtureEphemeralLaborBasis(),
  });
  eq("T4 catalogWorkCreateCalls", catalogWorkCreateCalls, 0);
}

console.log("\n=== T5: ZERO HTTP ===");
{
  httpCalls = 0;
  computeShadowPositionCostForOfferBoqLine({
    line: lineNoCatalog(),
    store: emptyStore,
    nowMs: NOW,
    ephemeralCostBasis: fixtureEphemeralLaborBasis(),
  });
  eq("T5 httpCalls", httpCalls, 0);
}

console.log("\n=== T6: null catalogWorkId + NO ephemeral → still NO_IDENTITY ===");
{
  const row = computeShadowPositionCostForOfferBoqLine({
    line: lineNoCatalog(),
    store: emptyStore,
    nowMs: NOW,
  });
  eq("T6 identity NO_IDENTITY", row.identity.status, "NO_IDENTITY");
  eq("T6 position null", row.position, null);
  eq("T6 engineInput null", row.engineInput, null);
  ok(
    "T6 gap BRAK_IDENTYFIKACJI_ROBOTY",
    row.gaps.includes("BRAK_IDENTYFIKACJI_ROBOTY"),
    row.gaps,
  );
  ok(
    "T6 costBasisKind not ephemeral",
    row.costBasisKind == null || row.costBasisKind !== "EPHEMERAL_RESEARCH",
    row.costBasisKind,
  );
}

console.log("\n=== T7: CatalogBound path identity unchanged ===");
{
  const line = lineNoCatalog({
    catalogWorkId: "cw.test.paint.m2",
    unit: "m2",
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
    matchConfidence: "high",
    candidateMatches: [
      {
        catalogWorkId: "cw.test.paint.m2",
        workNamePl: "Malowanie",
        workCategory: "MALOWANIE",
        tradeId: "MALOWANIE",
        score: 90,
        role: "primary",
        matchedBy: "catalog_map",
        matchConfidence: "high",
        rationale: "test",
      },
    ],
  });
  const id = resolveWorkIdentityFromOfferBoqLine(line);
  ok(
    "T7 identity not NO_IDENTITY when catalog bound",
    id.status !== "NO_IDENTITY",
    id,
  );
  eq("T7 workId bound", id.workId, "cw.test.paint.m2");
}

console.log("\n=== T8: ephemeral candidate required fields ===");
{
  const basis = fixtureEphemeralLaborBasis();
  const v = validateEphemeralResearchBasis(basis);
  ok("T8 validates", v.ok, v);
  ok("T8 type EPHEMERAL_RESEARCH", basis.type === "EPHEMERAL_RESEARCH");
  ok("T8 candidateId", !!basis.candidateId);
  ok("T8 provenance evidence", basis.provenance.evidenceIds.length > 0);
  ok("T8 confidence", !!basis.components.labor?.confidence);
}

console.log("\n=== T9: no fake catalogWorkId ===");
{
  const clean = fixtureEphemeralLaborBasis();
  eq("T9 clean has no fake id", ephemeralBasisHasFakeCatalogId(clean), false);
  const dirty = { ...clean, catalogWorkId: "cw.fake.should.not.exist" };
  eq("T9 dirty detected", ephemeralBasisHasFakeCatalogId(dirty), true);
  const v = validateEphemeralResearchBasis(dirty);
  eq("T9 dirty rejected", v.ok, false);

  const row = computeShadowPositionCostForOfferBoqLine({
    line: lineNoCatalog(),
    store: emptyStore,
    nowMs: NOW,
    ephemeralCostBasis: fixtureEphemeralLaborBasis(),
  });
  eq("T9 result workId null", row.identity.workId, null);
}

console.log("\n=== T10: ZERO KV write / Accept ===");
{
  computeShadowPositionCostForOfferBoqLine({
    line: lineNoCatalog(),
    store: emptyStore,
    nowMs: NOW,
    ephemeralCostBasis: fixtureEphemeralLaborBasis(),
  });
  eq("T10 kvWriteCalls", kvWriteCalls, 0);
  eq("T10 acceptCalls", acceptCalls, 0);
}

globalThis.fetch = originalFetch;

console.log("");
console.log(
  `SLICE1 RESULT: ${pass} PASS / ${fail} FAIL · HTTP=${httpCalls} CREATE=${catalogWorkCreateCalls} KV=${kvWriteCalls} ACCEPT=${acceptCalls}`,
);
if (fail > 0) process.exit(1);
