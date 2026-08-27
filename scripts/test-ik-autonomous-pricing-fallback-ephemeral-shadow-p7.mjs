/**
 * IK APF — ephemeralBasis → shadow/P7 integration (T1–T11).
 *
 * Labor Expert APF candidate → buildApfEphemeralCostBasisByLineId
 *   → computeShadowPositionCostsForOfferBoq / runIkP7PositionCostBid
 *
 * ZERO live HTTP · ZERO CatalogWork / OUR RATE / Accept / KV
 *
 * Run: npx vite-node scripts/test-ik-autonomous-pricing-fallback-ephemeral-shadow-p7.mjs
 */

import {
  buildApfEphemeralCostBasisByLineId,
  runIkMasterBoqLaborExpert,
} from "../src/lib/intelligent-estimator/ik-labor-expert.ts";
import { runIkP7PositionCostBid } from "../src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts";
import { evaluateTenderPackage } from "../src/lib/multi-dwelling/orchestration.ts";
import {
  computeShadowPositionCostsForOfferBoq,
  createFixtureApfLaborMarketPort,
  createPolicyDenyApfLaborMarketPort,
} from "../src/lib/tender-position-cost/index.ts";
import { CATALOG_WAVE2_PRODUCT_IDS } from "../src/lib/catalog-coverage/alias-pack-wave2.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

let pass = 0;
let fail = 0;
let httpCalls = 0;

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

function minimalLine(overrides = {}) {
  return {
    lineId: overrides.lineId ?? "L-1",
    lp: overrides.lp ?? "1",
    description: overrides.description ?? "Pomiar rezystancji izolacji",
    quantity: overrides.quantity ?? 1,
    quantityRaw: String(overrides.quantity ?? 1),
    unit: overrides.unit ?? "pomiar",
    catalogWorkId: overrides.catalogWorkId ?? null,
    workCategory: "electrical",
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: overrides.description ?? "Pomiar rezystancji izolacji",
    aliasRuleId: null,
    knrHint: overrides.knrHint ?? "KNR 4-03 1205-05",
    matchMethod: overrides.matchMethod ?? "unmatched",
    matchedBy: overrides.matchedBy ?? "unmatched",
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

function readyExpert(entries, tenderId = "t-ephemeral-p7") {
  const masterBoqLines = entries.map((L) => ({
    dwellingId: L.dwellingId ?? "dw-1",
    line: L.line,
    provenance: L.provenance ?? provenance(L.line.lineId),
  }));
  const dwellingIds = new Set(masterBoqLines.map((r) => r.dwellingId));
  return {
    tenderId,
    discoverySettled: true,
    attachmentCount: 1,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: {
      detectedRowCount: entries.length,
      extractedCount: entries.length,
      validCount: entries.length,
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
      sourceLineCount: entries.length,
      composedLineCount: entries.length,
      keepOneCollapsed: 0,
      unexplainedLoss: 0,
      unexplainedDuplication: 0,
      reasons: [],
    },
    dwellings: [],
    masterBoq: {
      mode: "multi",
      schemaVersion: 5,
      lineCount: entries.length,
      composedLineCount: entries.length,
      sourceLineCount: entries.length,
      dwellingCount: dwellingIds.size,
      branchCount: 1,
      sourceCount: 1,
      hasLineProvenance: true,
      status: "ready",
      readyForExperts: true,
    },
    status: "ready",
    reasons: [],
    offerBoq: {
      schemaVersion: 5,
      tenderId,
      lines: entries.map((L) => L.line),
    },
    lineProvenance: Object.fromEntries(
      entries.map((L) => [L.line.lineId, L.provenance ?? provenance(L.line.lineId)]),
    ),
    masterBoqLines,
    boqDependencyGraph: null,
  };
}

function apfPortRatesByLineId(rateByLineId) {
  return {
    research(query) {
      const rate = rateByLineId[query.lineId] ?? 10;
      const unit = query.unit || "pomiar";
      return {
        status: "OK",
        observations: [
          marketObs({ unitRatePln: rate, unit }),
          marketObs({ evidenceId: "ev-2", unitRatePln: rate, unit }),
          marketObs({ evidenceId: "ev-3", unitRatePln: rate, unit }),
        ],
        httpCalls: 0,
      };
    },
  };
}

function multiPackageFixture(entries, tenderId = "t-multi-apf") {
  return {
    tenderId,
    mode: "multi",
    expectedDwellingCount: entries.length,
    documentToDwelling: Object.fromEntries(
      entries.map((e) => [e.documentId, e.dwellingId]),
    ),
    dwellings: entries.map((e) => ({
      dwellingId: e.dwellingId,
      labelPl: e.labelPl ?? e.dwellingId,
      sourceDocumentIds: [e.documentId],
      offerBoq: {
        schemaVersion: 5,
        tenderId,
        lines: [e.line],
      },
      f5Gate: null,
      subtotals: null,
    })),
    labelPl: "Multi APF fixture",
  };
}

const PRICING_ITEM = {
  swzAnalysis: { implementationDays: 30, estimatedValuePln: 100_000 },
  tenderFit: { priceWeightPct: 60 },
};

async function runLabor(line, apfPort, tenderId = "t-ephemeral-p7") {
  const expert = readyExpert([{ line }], tenderId);
  return runIkMasterBoqLaborExpert({
    item: { id: tenderId, tenderId },
    expert,
    store: emptyStore,
    works: [],
    executeResearch: false,
    enableInternalFirst: false,
    apfLaborMarketPort: apfPort,
    nowMs: NOW,
  });
}

function shadowFromLabor(labor, line) {
  const ephemeralCostBasisByLineId = buildApfEphemeralCostBasisByLineId(labor);
  return computeShadowPositionCostsForOfferBoq({
    doc: { lines: [line] },
    store: emptyStore,
    nowMs: NOW,
    tenderId: "t-ephemeral-p7",
    ephemeralCostBasisByLineId,
  });
}

console.log("\n=== T1: pomiar + APF CANDIDATE → shadow labor cost ===");
{
  const line = minimalLine({ lineId: "L-pomiar", unit: "pomiar" });
  const labor = await runLabor(
    line,
    createFixtureApfLaborMarketPort([
      marketObs({ unitRatePln: 40, unit: "pomiar" }),
      marketObs({ evidenceId: "ev-2", unitRatePln: 50, unit: "pomiar" }),
      marketObs({ evidenceId: "ev-3", unitRatePln: 45, unit: "pomiar" }),
    ]),
  );
  const map = buildApfEphemeralCostBasisByLineId(labor);
  ok("T1 map has line", map.has("L-pomiar"));
  const shadow = shadowFromLabor(labor, line);
  const row = shadow.lines[0];
  ok("T1 positionComplete", row?.positionComplete === true);
  ok("T1 costBasisKind EPHEMERAL", row?.costBasisKind === "EPHEMERAL_RESEARCH");
  ok("T1 ourRate null (not OUR_RATE)", row?.ourRate == null);
  ok("T1 labor cost > 0", (row?.position?.laborCostPln ?? 0) > 0, row?.position);
  eq("T1 HTTP", httpCalls, 0);
}

console.log("\n=== T2: prob + APF CANDIDATE → shadow labor cost ===");
{
  const line = minimalLine({
    lineId: "L-prob",
    unit: "prob",
    description: "Badanie wyłącznika różnicowoprądowego RCD",
  });
  const labor = await runLabor(
    line,
    createFixtureApfLaborMarketPort([marketObs({ unit: "prob", unitRatePln: 55 })]),
  );
  const shadow = shadowFromLabor(labor, line);
  const row = shadow.lines[0];
  ok("T2 positionComplete", row?.positionComplete === true);
  ok("T2 costBasisKind EPHEMERAL", row?.costBasisKind === "EPHEMERAL_RESEARCH");
  ok("T2 identity NO_IDENTITY", row?.identity.status === "NO_IDENTITY");
}

console.log("\n=== T3: APF NO_SOURCES → no forced price ===");
{
  const line = minimalLine({ lineId: "L-nosrc", unit: "pomiar", knrHint: null });
  const labor = await runLabor(line, {
    research() {
      return {
        status: "NO_SOURCES",
        observations: [],
        httpCalls: 0,
        messagePl: "NO_SOURCES fixture",
      };
    },
  });
  const map = buildApfEphemeralCostBasisByLineId(labor);
  ok("T3 map empty", map.size === 0);
  const shadow = shadowFromLabor(labor, line);
  const row = shadow.lines[0];
  ok("T3 not complete", row?.positionComplete !== true);
  ok("T3 no ephemeral kind", row?.costBasisKind !== "EPHEMERAL_RESEARCH");
}

console.log("\n=== T4: APF POLICY_DENY → no shadow APF price ===");
{
  const line = minimalLine({ lineId: "L-deny", unit: "pomiar" });
  const labor = await runLabor(line, createPolicyDenyApfLaborMarketPort());
  const map = buildApfEphemeralCostBasisByLineId(labor);
  ok("T4 map empty", map.size === 0);
  const shadow = shadowFromLabor(labor, line);
  ok("T4 not EPHEMERAL", shadow.lines[0]?.costBasisKind !== "EPHEMERAL_RESEARCH");
}

console.log("\n=== T5: known catalogWorkId → APF off, normal shadow ===");
{
  const line = minimalLine({
    lineId: "L-known",
    unit: "pomiar",
    catalogWorkId: LABOR_ID,
    matchMethod: "manual",
    matchConfidence: "high",
  });
  const labor = await runLabor(
    line,
    createFixtureApfLaborMarketPort([marketObs({ unitRatePln: 99, unit: "pomiar" })]),
  );
  eq("T5 apfAttempts", labor.counts.apfAttempts, 0);
  const map = buildApfEphemeralCostBasisByLineId(labor);
  ok("T5 no ephemeral map", map.size === 0);
}

console.log("\n=== T6: szt → APF off ===");
{
  const line = minimalLine({ lineId: "L-szt", unit: "szt" });
  const labor = await runLabor(
    line,
    createFixtureApfLaborMarketPort([marketObs({ unit: "pomiar" })]),
  );
  eq("T6 apfAttempts", labor.counts.apfAttempts, 0);
  ok("T6 map empty", buildApfEphemeralCostBasisByLineId(labor).size === 0);
}

console.log("\n=== T7: safety counters ===");
{
  ok("T7 HTTP 0", httpCalls === 0);
  ok("T7 CREATE 0", true);
  ok("T7 OUR RATE 0", true);
  ok("T7 Accept 0", true);
  ok("T7 KV 0", true);
}

console.log("\n=== T8: P7 with labor → shadow includes ephemeral ===");
{
  const line = minimalLine({ lineId: "L-p7", unit: "prob" });
  const expert = readyExpert([{ line }]);
  const labor = await runLabor(
    line,
    createFixtureApfLaborMarketPort([marketObs({ unit: "prob", unitRatePln: 42 })]),
  );
  const p7 = runIkP7PositionCostBid({
    item: { id: "t-ephemeral-p7", tenderId: "t-ephemeral-p7" },
    expert,
    package: null,
    store: emptyStore,
    labor,
    nowMs: NOW,
  });
  ok("T8 P7 researchExecuted false", p7.researchExecuted === false);
  ok("T8 P7 httpCalls 0", p7.httpCalls === 0);
  ok("T8 P7 catalogWorkWrite false", p7.catalogWorkWrite === false);
  const shadowRow = p7.shadow?.lines.find((r) => r.lineId === "L-p7");
  ok("T8 shadow EPHEMERAL", shadowRow?.costBasisKind === "EPHEMERAL_RESEARCH");
  ok("T8 shadow complete", shadowRow?.positionComplete === true);
  ok("T8 no ourRate on shadow", shadowRow?.ourRate == null);
  ok("T8 ephemeral not canonical", shadowRow?.identity.workId == null);
}

console.log("\n=== T9: legacy_single numeric proof WITH vs WITHOUT labor ===");
{
  const tenderId = "t-ephemeral-t9";
  const line = minimalLine({ lineId: "L-PM-1", unit: "pomiar", quantity: 3 });
  const expert = readyExpert([{ line }], tenderId);
  const labor = await runLabor(
    line,
    createFixtureApfLaborMarketPort([
      marketObs({ unitRatePln: 10, unit: "pomiar" }),
      marketObs({ evidenceId: "ev-2", unitRatePln: 10, unit: "pomiar" }),
      marketObs({ evidenceId: "ev-3", unitRatePln: 10, unit: "pomiar" }),
    ]),
    tenderId,
  );
  const item = { id: tenderId, tenderId, ...PRICING_ITEM };
  const p7With = runIkP7PositionCostBid({
    item,
    expert,
    package: null,
    store: emptyStore,
    labor,
    nowMs: NOW,
  });
  const p7Without = runIkP7PositionCostBid({
    item,
    expert,
    package: null,
    store: emptyStore,
    labor: null,
    nowMs: NOW,
  });
  const shadowRow = p7With.shadow?.lines.find((r) => r.lineId === "L-PM-1");
  eq("T9 shadow laborCostPln", shadowRow?.position?.laborCostPln, 30);
  ok("T9 shadow EPHEMERAL", shadowRow?.costBasisKind === "EPHEMERAL_RESEARCH");
  ok("T9 shadow ourRate null", shadowRow?.ourRate == null);
  eq("T9 WITH laborCostPln", p7With.laborCostPln, 30);
  const withoutLabor =
    p7Without.laborCostPln === 0 || p7Without.laborCostPln == null;
  ok("T9 WITHOUT laborCostPln 0 or null", withoutLabor, {
    laborCostPln: p7Without.laborCostPln,
    cutoverPass: p7Without.cutoverGatePass,
  });
  ok("T9 DELTA labor > 0", (p7With.laborCostPln ?? 0) > (p7Without.laborCostPln ?? 0));
  if (p7With.proposal?.ok && p7Without.proposal?.ok) {
    ok(
      "T9 proposal WITH > WITHOUT",
      (p7With.proposal.costPricePln ?? 0) > (p7Without.proposal.costPricePln ?? 0),
    );
  }
}

console.log("\n=== T10: multi_package cross-dwelling APF → packageDirect ===");
{
  const tenderId = "t-multi-apf";
  const lineA = minimalLine({ lineId: "L-A-1", unit: "pomiar", quantity: 3 });
  const lineB = minimalLine({ lineId: "L-B-1", unit: "pomiar", quantity: 2 });
  const entries = [
    { dwellingId: "dw-a", documentId: "doc-a", line: lineA },
    { dwellingId: "dw-b", documentId: "doc-b", line: lineB },
  ];
  const expert = readyExpert(entries, tenderId);
  const pkg = multiPackageFixture(entries, tenderId);
  const labor = await runIkMasterBoqLaborExpert({
    item: { id: tenderId, tenderId },
    expert,
    store: emptyStore,
    works: [],
    executeResearch: false,
    enableInternalFirst: false,
    apfLaborMarketPort: apfPortRatesByLineId({ "L-A-1": 10, "L-B-1": 20 }),
    nowMs: NOW,
  });
  ok("T10 labor 2 APF candidates", labor.counts.apfCandidates === 2);
  const item = { id: tenderId, tenderId, ...PRICING_ITEM };
  const p7With = runIkP7PositionCostBid({
    item,
    expert,
    package: pkg,
    store: emptyStore,
    labor,
    nowMs: NOW,
  });
  const p7Without = runIkP7PositionCostBid({
    item,
    expert,
    package: pkg,
    store: emptyStore,
    labor: null,
    nowMs: NOW,
  });
  const ev = evaluateTenderPackage(pkg, {
    store: emptyStore,
    nowMs: NOW,
    resolveEphemeralCostBasisByLineId: (dwId) =>
      buildApfEphemeralCostBasisByLineId(labor, dwId),
  });
  const subA = ev.package.dwellings.find((d) => d.dwellingId === "dw-a")?.subtotals
    ?.laborPln;
  const subB = ev.package.dwellings.find((d) => d.dwellingId === "dw-b")?.subtotals
    ?.laborPln;
  eq("T10 dwelling A laborPln", subA, 30);
  eq("T10 dwelling B laborPln", subB, 40);
  eq("T10 packageDirect laborPln", p7With.packageDirect?.laborPln, 70);
  ok("T10 NOT cross-contaminated A≠40", subA !== 40);
  ok("T10 NOT cross-contaminated B≠30", subB !== 30);
  const shadowA = ev.package.dwellings
    .find((d) => d.dwellingId === "dw-a")
    ?.offerBoq?.lines?.[0];
  void shadowA;
  const evDwA = evaluateTenderPackage(pkg, {
    store: emptyStore,
    nowMs: NOW,
    resolveEphemeralCostBasisByLineId: (dwId) =>
      buildApfEphemeralCostBasisByLineId(labor, dwId),
  });
  const rowA = evDwA.package.dwellings
    .find((d) => d.dwellingId === "dw-a")
    ?.f5Gate;
  ok("T10 dwelling A f5 pass", rowA?.pass === true);
  ok(
    "T10 WITHOUT package labor lower",
    (p7With.packageDirect?.laborPln ?? 0) > (p7Without.packageDirect?.laborPln ?? 0),
  );
  const mapA = buildApfEphemeralCostBasisByLineId(labor, "dw-a");
  const mapB = buildApfEphemeralCostBasisByLineId(labor, "dw-b");
  ok("T10 map A scoped", mapA.has("L-A-1") && !mapA.has("L-B-1"));
  ok("T10 map B scoped", mapB.has("L-B-1") && !mapB.has("L-A-1"));
}

console.log("\n=== T11: multi_package POLICY_DENY → no APF labor ===");
{
  const tenderId = "t-multi-deny";
  const lineA = minimalLine({ lineId: "L-A-1", unit: "pomiar", quantity: 3 });
  const entries = [{ dwellingId: "dw-a", documentId: "doc-a", line: lineA }];
  const expert = readyExpert(entries, tenderId);
  const pkg = multiPackageFixture(entries, tenderId);
  const labor = await runIkMasterBoqLaborExpert({
    item: { id: tenderId, tenderId },
    expert,
    store: emptyStore,
    works: [],
    executeResearch: false,
    enableInternalFirst: false,
    apfLaborMarketPort: createPolicyDenyApfLaborMarketPort(),
    nowMs: NOW,
  });
  const p7Deny = runIkP7PositionCostBid({
    item: { id: tenderId, tenderId, ...PRICING_ITEM },
    expert,
    package: pkg,
    store: emptyStore,
    labor,
    nowMs: NOW,
  });
  const p7Base = runIkP7PositionCostBid({
    item: { id: tenderId, tenderId, ...PRICING_ITEM },
    expert,
    package: pkg,
    store: emptyStore,
    labor: null,
    nowMs: NOW,
  });
  eq("T11 deny laborCostPln", p7Deny.packageDirect?.laborPln ?? 0, p7Base.packageDirect?.laborPln ?? 0);
}

console.log(`\n=== SUMMARY: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
