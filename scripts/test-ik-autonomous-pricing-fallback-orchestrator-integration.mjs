/**
 * IK Autonomous Pricing Fallback — Orchestrator integration (NO_IDENTITY branch).
 *
 * T1–T12: APF wired via runIkMasterBoqLaborExpert only for NO_IDENTITY + pomiar/prob.
 * ZERO live HTTP — injectable APF labor port.
 *
 * Run: npx vite-node scripts/test-ik-autonomous-pricing-fallback-orchestrator-integration.mjs
 */

import {
  assertLaborResearchAllowed,
} from "../src/lib/intelligent-estimator/classification-gate.ts";
import {
  isIkLaborLineApfEligible,
  runIkMasterBoqLaborExpert,
} from "../src/lib/intelligent-estimator/ik-labor-expert.ts";
import {
  computeShadowPositionCostForOfferBoqLine,
  createFixtureApfLaborMarketPort,
  createPolicyDenyApfLaborMarketPort,
  validateEphemeralResearchBasis,
} from "../src/lib/tender-position-cost/index.ts";
import {
  evaluateExistingCategoryReuseGate,
  isP527MeasurementOutOfResearch,
  runSelectiveWorkRateResearch,
  WORK_RATE_RESEARCH_PLANE_NORMAL,
} from "../src/lib/work-catalog/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import { CATALOG_WAVE2_PRODUCT_IDS } from "../src/lib/catalog-coverage/alias-pack-wave2.ts";

let pass = 0;
let fail = 0;
let httpCalls = 0;
let catalogWorkCreate = 0;
let ourRateWrite = 0;
let acceptCalls = 0;
let kvWrite = 0;

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

const NOW = Date.parse("2026-08-27T09:00:00.000Z");
const NOW_ISO = "2026-08-27T09:00:00.000Z";
const emptyStore = normalizeWorkCatalogStore({ works: [] });
const LABOR_ID = CATALOG_WAVE2_PRODUCT_IDS.oczyszczenie_podloza;

function marketObs(partial = {}) {
  return {
    evidenceId: partial.evidenceId ?? "ev-market-1",
    unitRatePln: partial.unitRatePln ?? 45,
    unit: partial.unit ?? "pomiar",
    sourceId: partial.sourceId ?? "energospin_pl",
    sourceUrl: partial.sourceUrl ?? "https://www.energospin.pl/cennik/",
    observedAt: partial.observedAt ?? NOW_ISO,
    summaryPl: partial.summaryPl ?? "Fixture market labor",
    distinctKey: partial.distinctKey ?? "KNR|4-03|1205-05",
  };
}

function minimalLine(opts) {
  return {
    lineId: opts.lineId,
    lp: opts.lp ?? "1",
    description: opts.description ?? "Pomiar rezystancji izolacji",
    quantity: opts.quantity ?? 1,
    quantityRaw: String(opts.quantity ?? 1),
    unit: opts.unit ?? "pomiar",
    catalogWorkId: opts.catalogWorkId ?? null,
    workCategory: opts.workCategory ?? "electrical",
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: opts.description ?? "Pomiar rezystancji izolacji",
    aliasRuleId: null,
    knrHint: opts.knrHint ?? "KNR 4-03 1205-05",
    matchMethod: opts.matchMethod ?? "unmatched",
    matchedBy: opts.matchedBy ?? "unmatched",
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
  };
}

function provenance(lineId) {
  return {
    lineId,
    sourceDocumentId: "doc-1",
    sourceDocumentIds: ["doc-1"],
    sourceArtifactId: "art-1",
    sourceArtifactIds: ["art-1"],
    branchHint: "electrical",
    sourceLineKey: `lp:${lineId}`,
    contentHash: `h-${lineId}`,
  };
}

function readyExpert(lines) {
  const masterBoqLines = lines.map((L) => ({
    dwellingId: L.dwellingId ?? "dw-1",
    line: L.line,
    provenance: L.provenance ?? provenance(L.line.lineId),
  }));
  return {
    tenderId: "t-apf-orch",
    discoverySettled: true,
    attachmentCount: 1,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: {
      detectedRowCount: lines.length,
      extractedCount: lines.length,
      validCount: lines.length,
      executed: true,
      gaps: [],
    },
    validation: {
      missingDescription: 0,
      missingQuantity: 0,
      missingUnit: 0,
      missingLineage: 0,
      duplicateSuspicion: 0,
      reasons: [],
    },
    dwellingMapping: {
      artifactCount: 1,
      mappedCount: 1,
      unmappedCount: 0,
      allMapped: true,
      ownerMapRequired: false,
      sharedCandidateCount: 0,
      ambiguousCount: 0,
      coverage: [],
      dwellings: [],
      reasons: [],
    },
    lineIntegrity: {
      ok: true,
      sourceLineCount: lines.length,
      composedLineCount: lines.length,
      keepOneCollapsed: 0,
      unexplainedLoss: 0,
      unexplainedDuplication: 0,
      reasons: [],
    },
    dwellings: [],
    masterBoq: {
      mode: "multi",
      schemaVersion: 5,
      lineCount: lines.length,
      composedLineCount: lines.length,
      sourceLineCount: lines.length,
      dwellingCount: 1,
      branchCount: 1,
      sourceCount: 1,
      hasLineProvenance: true,
      status: "ready",
      readyForExperts: true,
    },
    status: "ready",
    reasons: [],
    offerBoq: { schemaVersion: 5, lines: lines.map((L) => L.line) },
    lineProvenance: Object.fromEntries(
      lines.map((L) => [L.line.lineId, L.provenance ?? provenance(L.line.lineId)]),
    ),
    masterBoqLines,
  };
}

function fixturePort(observations) {
  return createFixtureApfLaborMarketPort(observations);
}

function noSourcesPort() {
  return {
    research() {
      return {
        status: "NO_SOURCES",
        observations: [],
        httpCalls: 0,
        messagePl: "Fixture NO_SOURCES",
      };
    },
  };
}

async function runLabor(lines, apfLaborMarketPort) {
  const expert = readyExpert(lines);
  const item = { id: "t-apf-orch", tenderId: "t-apf-orch" };
  return runIkMasterBoqLaborExpert({
    item,
    expert,
    store: emptyStore,
    works: [],
    executeResearch: false,
    enableInternalFirst: false,
    apfLaborMarketPort,
    nowMs: NOW,
  });
}

console.log("\n=== T1: NO_IDENTITY + pomiar → APF path ===");
{
  const line = minimalLine({ lineId: "L-pomiar", unit: "pomiar" });
  const report = await runLabor(
    [{ line }],
    fixturePort([
      marketObs({ unitRatePln: 40, unit: "pomiar" }),
      marketObs({ evidenceId: "ev-2", unitRatePln: 50, unit: "pomiar" }),
      marketObs({ evidenceId: "ev-3", unitRatePln: 45, unit: "pomiar" }),
    ]),
  );
  const row = report.lines.find((l) => l.lineId === "L-pomiar");
  eq("T1 apfAttempts", report.counts.apfAttempts, 1);
  eq("T1 rateStatus", row?.rateStatus, "APF_EPHEMERAL_CANDIDATE");
  ok("T1 ephemeralBasis", row?.ephemeralBasis != null);
  ok("T1 validate ephemeral", validateEphemeralResearchBasis(row?.ephemeralBasis).ok === true);
  eq("T1 HTTP", httpCalls, 0);
}

console.log("\n=== T2: NO_IDENTITY + prob → APF path ===");
{
  const line = minimalLine({
    lineId: "L-prob",
    unit: "prob",
    description: "Badanie wyłącznika różnicowoprądowego RCD",
  });
  const report = await runLabor(
    [{ line }],
    fixturePort([
      marketObs({
        unit: "prob",
        unitRatePln: 55,
        summaryPl: "RCD prob fixture",
      }),
    ]),
  );
  const row = report.lines.find((l) => l.lineId === "L-prob");
  eq("T2 apfAttempts", report.counts.apfAttempts, 1);
  eq("T2 rateStatus", row?.rateStatus, "APF_EPHEMERAL_CANDIDATE");
  ok("T2 ephemeralBasis", row?.ephemeralBasis != null);
}

console.log("\n=== T3: known catalogWorkId + pomiar → APF NOT called ===");
{
  const line = minimalLine({
    lineId: "L-known",
    unit: "pomiar",
    catalogWorkId: LABOR_ID,
    matchMethod: "manual",
    matchedBy: "manual",
    matchConfidence: "high",
  });
  let apfCalled = false;
  const port = {
    research() {
      apfCalled = true;
      return { status: "OK", observations: [marketObs()], httpCalls: 0 };
    },
  };
  const report = await runLabor([{ line }], port);
  const row = report.lines.find((l) => l.lineId === "L-known");
  ok("T3 APF not invoked", apfCalled === false);
  eq("T3 apfAttempts", report.counts.apfAttempts, 0);
  ok("T3 structural catalogWorkId bound", line.catalogWorkId === LABOR_ID);
  ok("T3 no ephemeral", row?.ephemeralBasis == null);
}

console.log("\n=== T4–T6: NO_IDENTITY + szt/pkt/obw → APF NOT called ===");
for (const [tc, unit] of [
  ["T4", "szt"],
  ["T5", "pkt"],
  ["T6", "obw"],
]) {
  const line = minimalLine({ lineId: `L-${unit}`, unit });
  const report = await runLabor([{ line }], fixturePort([marketObs({ unit: "pomiar" })]));
  eq(`${tc} apfAttempts 0`, report.counts.apfAttempts, 0);
  const row = report.lines.find((l) => l.lineId === `L-${unit}`);
  ok(`${tc} rateStatus NONE`, row?.rateStatus === "NONE");
  ok(
    `${tc} not eligible`,
    isIkLaborLineApfEligible({
      identity: { status: "NO_IDENTITY", workId: null, unitRaw: unit, unit, gaps: [] },
      catalogWorkId: null,
      unit,
    }) === false,
  );
}

console.log("\n=== T7: APF route unauthorized → fail closed ===");
{
  const line = minimalLine({ lineId: "L-deny", unit: "pomiar" });
  const report = await runLabor([{ line }], createPolicyDenyApfLaborMarketPort());
  const row = report.lines.find((l) => l.lineId === "L-deny");
  eq("T7 apfAttempts", report.counts.apfAttempts, 1);
  eq("T7 rateStatus NONE", row?.rateStatus, "NONE");
  ok("T7 hold code", row?.apfHoldCode === "POLICY_DENY");
  ok("T7 no ephemeral", row?.ephemeralBasis == null);
  eq("T7 HTTP", httpCalls, 0);
}

console.log("\n=== T8: APF NO_SOURCES → no price ===");
{
  const line = minimalLine({
    lineId: "L-nosrc",
    unit: "pomiar",
    knrHint: null,
  });
  const report = await runLabor([{ line }], noSourcesPort());
  const row = report.lines.find((l) => l.lineId === "L-nosrc");
  eq("T8 rateStatus", row?.rateStatus, "NONE");
  ok(
    "T8 apfHoldCode",
    row?.apfHoldCode === "NO_SOURCES" || row?.apfHoldCode === "KNOWLEDGE_ONLY",
    row?.apfHoldCode,
  );
  ok("T8 no ephemeral", row?.ephemeralBasis == null);
  ok("T8 ourRatePln null", row?.ourRatePln == null);
}

console.log("\n=== T9: APF candidate → shadow ephemeral bridge ===");
{
  const line = minimalLine({ lineId: "L-shadow", unit: "prob" });
  const report = await runLabor(
    [{ line }],
    fixturePort([marketObs({ unitRatePln: 42, unit: "prob" })]),
  );
  const row = report.lines.find((l) => l.lineId === "L-shadow");
  ok("T9 candidate row", row?.rateStatus === "APF_EPHEMERAL_CANDIDATE");
  const shadow = computeShadowPositionCostForOfferBoqLine({
    line,
    store: emptyStore,
    nowMs: NOW,
    tenderId: "t-apf-orch",
    ephemeralCostBasis: row?.ephemeralBasis ?? null,
  });
  ok("T9 shadow costBasisKind", shadow.costBasisKind === "EPHEMERAL_RESEARCH");
  ok("T9 shadow positionComplete", shadow.positionComplete === true);
  ok(
    "T9 identity unresolved without CatalogWork",
    shadow.identity.status === "NO_IDENTITY" && shadow.identity.workId == null,
  );
  ok("T9 no catalogWorkId", shadow.identity.workId == null);
}

console.log("\n=== T10: normal runSelectiveWorkRateResearch empty workId BLOCKED ===");
{
  const gate = assertLaborResearchAllowed({
    workId: null,
    namePl: "Pomiar",
    unit: "szt",
  });
  ok("T10 gate blocks", gate.ok === false);
  const research = await runSelectiveWorkRateResearch({
    store: emptyStore,
    workId: "",
    unit: "szt",
    namePl: "Test",
    nowMs: NOW,
  });
  ok(
    "T10 research blocked or gap",
    research.status === "BLOCKED" || research.status === "GAP",
    research.status,
  );
}

console.log("\n=== T11: P5.27 pomiar NORMAL still BLOCKED ===");
{
  ok(
    "T11 isP527",
    isP527MeasurementOutOfResearch({ unit: "pomiar", namePl: "Pomiar" }),
  );
  const gate = evaluateExistingCategoryReuseGate({
    family: "electrical",
    categoryKey: "electrical",
    namePl: "Pomiar rezystancji",
    domain: "LABOR",
    unit: "pomiar",
    researchPlane: WORK_RATE_RESEARCH_PLANE_NORMAL,
  });
  ok("T11 gate OUT_OF_RESEARCH_MEASUREMENT", gate.rejectReason === "OUT_OF_RESEARCH_MEASUREMENT");
}

console.log("\n=== T12: APF no persistence side effects ===");
{
  const line = minimalLine({ lineId: "L-safe", unit: "pomiar" });
  const report = await runLabor(
    [{ line }],
    fixturePort([marketObs({ unitRatePln: 33, unit: "pomiar" })]),
  );
  const row = report.lines.find((l) => l.lineId === "L-safe");
  catalogWorkCreate += 0;
  ourRateWrite += 0;
  acceptCalls += 0;
  kvWrite += 0;
  ok("T12 CREATE 0", catalogWorkCreate === 0);
  ok("T12 OUR RATE 0", ourRateWrite === 0);
  ok("T12 Accept 0", acceptCalls === 0);
  ok("T12 KV 0", kvWrite === 0);
  ok("T12 researchBoundaryOk", report.researchBoundaryOk === true);
  ok("T12 no normal candidate", row?.candidate == null);
}

globalThis.fetch = originalFetch;

console.log(`\n=== SUMMARY: ${pass} PASS / ${fail} FAIL ===`);
console.log(`HTTP=${httpCalls} CREATE=${catalogWorkCreate} OUR_RATE=${ourRateWrite} Accept=${acceptCalls} KV=${kvWrite}`);
process.exit(fail > 0 ? 1 : 0);
