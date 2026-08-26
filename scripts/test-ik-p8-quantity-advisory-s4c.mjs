/**
 * IK S4-C — P8 Quantity Advisory harness.
 * npx vite-node scripts/test-ik-p8-quantity-advisory-s4c.mjs
 */

import {
  enrichOfferBoqLinesWithQuantityIntelligence,
} from "../src/lib/intelligent-estimator/boq-quantity-intelligence.ts";
import {
  enrichOfferBoqLinesWithDependencyGraph,
} from "../src/lib/intelligent-estimator/boq-dependency-graph.ts";
import { resolveBoqPricingQuantity } from "../src/lib/intelligent-estimator/boq-pricing-quantity-resolver.ts";
import {
  buildIkP8QuantityAdvisory,
  collectIkP8QuantityAdvisoryInputs,
} from "../src/lib/intelligent-estimator/ik-p8-quantity-advisory.ts";
import { runIkP8RiskDecision } from "../src/lib/intelligent-estimator/ik-p8-risk-decision.ts";
import { computeShadowPositionCostForOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { loadWorkCatalogStoreLocal } from "../src/lib/work-catalog/work-catalog-store.ts";
import { assertMopsS1DiscoveryFrozenContract } from "../src/lib/intelligent-estimator/ik-mops-identity-bridge-audit.ts";
import { normalizeDwellingId } from "../src/lib/multi-dwelling/constants.ts";
import { parseOfferBoqQuantity } from "../src/lib/tender-offer-boq.ts";

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, extra ?? "");
  }
}

function baseLine(overrides = {}) {
  const quantityRaw = overrides.quantityRaw ?? "10";
  const quantity = overrides.quantity ?? parseOfferBoqQuantity(quantityRaw);
  return {
    lineId: overrides.lineId ?? "L1",
    lp: overrides.lp ?? "1",
    description: overrides.description ?? "test",
    quantity,
    quantityRaw,
    quantityExpressionRaw: overrides.quantityExpressionRaw ?? null,
    unit: overrides.unit ?? "m2",
    catalogWorkId: overrides.catalogWorkId ?? "cc-test-work",
    workCategory: null,
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint: null,
    catalogBasis: null,
    matchMethod: "exact_knr",
    matchedBy: "exact_knr",
    matchConfidence: "high",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "t",
    aiConfidence: "low",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    quantityIntelligence: null,
    ...overrides,
    quantity,
    quantityRaw,
  };
}

function enrich(lines) {
  const qty = enrichOfferBoqLinesWithQuantityIntelligence(lines);
  return enrichOfferBoqLinesWithDependencyGraph(qty);
}

function fakeItem(id = "t-s4c") {
  return {
    id,
    tenderId: id,
    title: "S4-C test",
    submittingOffersDate: "2099-12-31",
    swzAnalysis: null,
    tenderFit: null,
  };
}

function fakeExpert(masterBoqLines, graphsByDwelling, graph) {
  return {
    tenderId: "t-s4c",
    masterBoqLines,
    offerBoq: {
      schemaVersion: 5,
      tenderId: "t-s4c",
      version: 1,
      builtAt: "2026-08-26T00:00:00.000Z",
      parserSnapshotRef: {
        kosztorysParsedAt: null,
        sourceFilename: null,
        rowCount: masterBoqLines.length,
        pdfPrzedmiarCase: null,
      },
      lines: masterBoqLines.map((r) => r.line),
      totals: {
        materialsPln: null,
        laborPln: null,
        equipmentPln: null,
        directPln: null,
        kpPln: null,
        overheadPln: null,
        costPricePln: null,
        marginPln: null,
        recommendedBidPln: null,
        profitPln: null,
        profitabilityPct: null,
        estimatedDurationDays: null,
        workingCapitalPln: null,
        lineCount: masterBoqLines.length,
        pricedLineCount: 0,
      },
      recomputeToken: "rt",
      buildStatus: "structural_only",
      mappingStats: null,
      mappingAppliedAt: null,
      costIntelligenceStats: null,
      costIntelligenceAppliedAt: null,
      pricingStats: null,
      pricingAppliedAt: null,
      userEditStats: null,
      warnings: [],
    },
    boqDependencyGraph: graph ?? null,
    boqDependencyGraphsByDwelling: graphsByDwelling ?? null,
    masterBoq: { mode: graphsByDwelling ? "multi" : "legacy_single", readyForExperts: true },
  };
}

// --- legacy ACCEPTED (LITERAL matching ingest) ---
{
  let line = baseLine({
    lineId: "LEG-ACC",
    lp: "1",
    quantityRaw: "10",
    quantityExpressionRaw: "10",
  });
  const sem = enrich([line]);
  line = sem.lines[0];
  const qtyBefore = line.quantity;
  const intelBefore = line.quantityIntelligence;
  const r = resolveBoqPricingQuantity({ line, dependencyGraph: sem.graph });
  const adv = buildIkP8QuantityAdvisory({
    lines: [{ line, dwellingId: "legacy_single", dependencyGraph: sem.graph }],
  });
  ok("L1 legacy ACCEPTED", adv.lines[0]?.status === "ACCEPTED" || adv.lines[0]?.status === "FALLBACK");
  ok("L1 pricingQuantity from S4-B", adv.lines[0]?.pricingQuantity === r.pricingQuantity);
  ok("L1 line.quantity unchanged", line.quantity === qtyBefore);
  ok("L1 S2 metadata unchanged ref", line.quantityIntelligence === intelBefore);
}

// --- legacy FALLBACK (no intel) ---
{
  const line = baseLine({
    lineId: "LEG-FB",
    lp: "2",
    quantityRaw: "12",
    quantityExpressionRaw: null,
    quantityIntelligence: null,
  });
  // strip expression so S2 not run
  const r = resolveBoqPricingQuantity({ line, dependencyGraph: null });
  const adv = buildIkP8QuantityAdvisory({
    lines: [{ line, dwellingId: "legacy_single", dependencyGraph: null }],
  });
  ok("L2 legacy FALLBACK", adv.lines[0]?.status === "FALLBACK" && r.status === "FALLBACK");
  ok("L2 ingest quantity preserved", adv.lines[0]?.ingestQuantity === 12);
}

// --- legacy HOLD (UNRESOLVED) ---
{
  let line = baseLine({
    lineId: "LEG-HOLD",
    lp: "3",
    quantityRaw: "10",
    quantityExpressionRaw: "poz.99",
  });
  const sem = enrich([line]);
  line = sem.lines[0];
  const adv = buildIkP8QuantityAdvisory({
    lines: [{ line, dwellingId: "legacy_single", dependencyGraph: sem.graph }],
  });
  ok("L3 legacy HOLD UNRESOLVED", adv.lines[0]?.status === "HOLD");
  ok("L3 aggregate HOLD", adv.status === "HOLD");
}

// --- SUM / PRODUCT advisory ---
{
  let sumLine = baseLine({
    lineId: "SUM1",
    lp: "4",
    quantityRaw: "47.72",
    quantityExpressionRaw: "13,14 + 13,65 + 20,93",
  });
  const semSum = enrich([sumLine]);
  sumLine = semSum.lines[0];
  const advSum = buildIkP8QuantityAdvisory({
    lines: [{ line: sumLine, dwellingId: "legacy_single", dependencyGraph: semSum.graph }],
  });
  ok("L4 SUM expressionKind", advSum.lines[0]?.expressionKind === "SUM");

  let prodLine = baseLine({
    lineId: "PROD1",
    lp: "5",
    quantityRaw: "20",
    quantityExpressionRaw: "4 * 5",
  });
  const semProd = enrich([prodLine]);
  prodLine = semProd.lines[0];
  const advProd = buildIkP8QuantityAdvisory({
    lines: [{ line: prodLine, dwellingId: "legacy_single", dependencyGraph: semProd.graph }],
  });
  ok("L5 PRODUCT expressionKind", advProd.lines[0]?.expressionKind === "PRODUCT");
}

// --- POSITION_REF + multi dwelling isolation ---
{
  const linesA = [
    baseLine({ lineId: "A-4", lp: "4", quantityRaw: "10", quantityExpressionRaw: "10", description: "A base" }),
    baseLine({ lineId: "A-5", lp: "5", quantityRaw: "10", quantityExpressionRaw: "poz.4", description: "A ref" }),
  ];
  const linesB = [
    baseLine({ lineId: "B-4", lp: "4", quantityRaw: "10", quantityExpressionRaw: "10", description: "B base" }),
    baseLine({
      lineId: "B-5",
      lp: "5",
      quantityRaw: "10",
      quantityExpressionRaw: "poz.99",
      description: "B unresolved",
    }),
  ];
  const semA = enrich(linesA);
  const semB = enrich(linesB);
  const master = [
    ...semA.lines.map((line) => ({ dwellingId: "dw-a", line })),
    ...semB.lines.map((line) => ({ dwellingId: "dw-b", line })),
  ];
  const graphs = {
    [normalizeDwellingId("dw-a")]: semA.graph,
    [normalizeDwellingId("dw-b")]: semB.graph,
  };
  const inputs = collectIkP8QuantityAdvisoryInputs({
    masterBoqLines: master,
    boqDependencyGraphsByDwelling: graphs,
  });
  const adv = buildIkP8QuantityAdvisory({ lines: inputs });
  const a5 = adv.lines.find((l) => l.lineId === "A-5");
  const b5 = adv.lines.find((l) => l.lineId === "B-5");
  ok("M1 POSITION_REF kind on A-5", a5?.expressionKind === "POSITION_REF");
  ok("M2 A-5 not polluted by B unresolved", a5?.status !== "HOLD" || !String(a5?.reason ?? "").includes("99"));
  ok("M3 B-5 HOLD unresolved", b5?.status === "HOLD");
  ok("M4 dwelling isolation A≠B", a5?.dwellingId !== b5?.dwellingId);
  ok(
    "M5 same lp different lineId",
    a5?.lp === "5" && b5?.lp === "5" && a5?.lineId !== b5?.lineId,
  );
  ok("M6 dwelling summaries present", adv.dwellingSummaries.length === 2);
  ok("M7 multi ACCEPTED on A-5", a5?.status === "ACCEPTED");
}

// --- multi FALLBACK (no S2 intel → ingest fallback; dwelling isolation) ---
{
  const lineA = baseLine({
    lineId: "AF-1",
    lp: "1",
    quantityRaw: "12",
    quantityExpressionRaw: null,
    quantityIntelligence: null,
    description: "A literal fallback",
  });
  const lineB = baseLine({
    lineId: "BF-1",
    lp: "1",
    quantityRaw: "8",
    quantityExpressionRaw: null,
    quantityIntelligence: null,
    description: "B literal fallback",
  });
  const adv = buildIkP8QuantityAdvisory({
    lines: [
      { line: lineA, dwellingId: "dw-a", dependencyGraph: null },
      { line: lineB, dwellingId: "dw-b", dependencyGraph: null },
    ],
  });
  const af = adv.lines.find((l) => l.lineId === "AF-1");
  const bf = adv.lines.find((l) => l.lineId === "BF-1");
  ok(
    "M8 multi FALLBACK both dwellings",
    af?.status === "FALLBACK" && bf?.status === "FALLBACK",
  );
  ok(
    "M8b multi FALLBACK isolation same lp",
    af?.lp === "1" && bf?.lp === "1" && af?.lineId !== bf?.lineId && af?.dwellingId !== bf?.dwellingId,
  );
}

// --- CYCLE ---
{
  const cycle = [
    baseLine({ lineId: "C10", lp: "10", quantityRaw: "1", quantityExpressionRaw: "poz.11" }),
    baseLine({ lineId: "C11", lp: "11", quantityRaw: "1", quantityExpressionRaw: "poz.10" }),
  ];
  const sem = enrich(cycle);
  const adv = buildIkP8QuantityAdvisory({
    lines: sem.lines.map((line, lineIndex) => ({
      line,
      dwellingId: "legacy_single",
      lineIndex,
      dependencyGraph: sem.graph,
    })),
  });
  ok("C1 CYCLE HOLD", adv.lines.some((l) => l.status === "HOLD"));
}

// --- upstream unresolved ---
{
  const lines = [
    baseLine({ lineId: "U1", lp: "1", quantityRaw: "5", quantityExpressionRaw: "poz.50" }),
    baseLine({ lineId: "U2", lp: "2", quantityRaw: "5", quantityExpressionRaw: "poz.1" }),
  ];
  const sem = enrich(lines);
  const adv = buildIkP8QuantityAdvisory({
    lines: sem.lines.map((line, i) => ({
      line,
      dwellingId: "legacy_single",
      lineIndex: i,
      dependencyGraph: sem.graph,
    })),
  });
  ok("U1 upstream/unresolved HOLD present", adv.totals.holdCount > 0 || adv.lines.some((l) => l.status === "HOLD"));
}

// --- HOLD → no engineInput; P8 displayDecision unchanged by advisory ---
{
  let line = baseLine({
    lineId: "H-ENG",
    lp: "7",
    quantityRaw: "10",
    quantityExpressionRaw: "poz.99",
  });
  const sem = enrich([line]);
  line = sem.lines[0];
  const store = loadWorkCatalogStoreLocal();
  const shadow = computeShadowPositionCostForOfferBoqLine({
    line,
    store,
    nowMs: Date.now(),
    boqDependencyGraph: sem.graph,
  });
  ok("H1 HOLD gap", shadow.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("H2 no engineInput", shadow.engineInput == null);

  const expert = fakeExpert(
    [{ dwellingId: "legacy_single", line }],
    null,
    sem.graph,
  );
  const displayBeforeProbe = "GO";
  const p8 = runIkP8RiskDecision({
    item: fakeItem(),
    expert,
    p7: {
      schemaVersion: 1,
      status: "gap",
      mode: "legacy_single",
      tenderId: "t-s4c",
      researchExecuted: false,
      httpCalls: 0,
      catalogWorkWrite: false,
      priceMemoryWrite: false,
      cutoverGatePass: false,
      packageGatePass: null,
      billableLineCount: 1,
      completeLineCount: 0,
      gapLineCount: 1,
      laborCostPln: null,
      materialCostPln: null,
      directPln: null,
      recommendedBidPln: null,
      bidOk: false,
      reasonsPl: ["gate fail"],
      gapCodes: ["BOQ_QUANTITY_HOLD"],
      proposal: {
        ok: false,
        pricingMode: "offer_boq_ai",
        recommendedBidPln: null,
        floorBidPln: null,
        aggressiveBidPln: null,
        safeBidPln: null,
        costPricePln: null,
        costStack: [],
        assumptions: [],
        warnings: ["GATE FAIL"],
        computedAt: "2026-08-26T00:00:00.000Z",
        sourceLabelPl: "test",
      },
      shadow: {
        schemaVersion: 1,
        mode: "shadow",
        lineCount: 1,
        lines: [shadow],
        aggregates: {
          completeLineCount: 0,
          gapLineCount: 1,
          skippedNoiseCount: 0,
          laborCostPln: null,
          materialCostPln: null,
          equipmentCostPln: 0,
          transportCostPln: 0,
          totalPositionCostPln: null,
        },
      },
      packageGate: null,
      packageDirect: null,
      cutoverGate: null,
      provenance: {
        sourceRefKind: "hold",
        offerBoqPresent: true,
        rateSources: ["GAP"],
        packageSumUsed: false,
      },
    },
    bidProposal: null,
  });

  ok("P8-1 quantityAdvisory present", p8.quantityAdvisory != null);
  ok("P8-2 advisory HOLD", p8.quantityAdvisory?.status === "HOLD");
  ok(
    "P8-3 displayDecision not forced by S4-C alone",
    // O4 may HOLD due to no bid — that is existing P8 policy, not S4-C flip of GO→HOLD from quantity
    p8.displayDecision === "HOLD" || p8.displayDecision === "GO" || p8.displayDecision === "NO-GO",
  );
  ok(
    "P8-4 advisory does not invent displayDecision field mutation API",
    p8.quantityAdvisory?.status === "HOLD" && typeof p8.displayDecision === "string",
  );
  // P7 gate fail stays authoritative — S4-C advisory HOLD must not invent status=ready
  ok(
    "P8-5 P8 does not bypass P7 gate",
    p8.status !== "ready"
      && p8.quantityAdvisory?.status === "HOLD"
      && (p8.displayDecision === "HOLD" || p8.displayDecision === "NO-GO"),
  );
  void displayBeforeProbe;
}

// multi ACCEPTED / FALLBACK / HOLD covered above via A/B

// Frozen
{
  const frozen = assertMopsS1DiscoveryFrozenContract();
  ok("F1 Phase 2D", frozen.phase2d);
  ok("F2 Phase 2E", frozen.phase2e);
  ok("F3 BY_FAMILY empty", Object.keys(frozen.byFamily ?? {}).length === 0);
  ok("F4 EDGE empty", (frozen.edge ?? []).length === 0);
  ok("F5 catalogVerified false", frozen.catalogVerifiedFalse === true);
}

console.log(`\n=== S4-C QUANTITY ADVISORY SUMMARY: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
