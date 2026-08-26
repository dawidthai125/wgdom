/**
 * IK P0 consumption — MULTI-BOQ expression + P7-SYNC + PKG-GRAPH.
 * npx vite-node scripts/test-ik-boq-s1s4-consumption-p0.mjs
 */

import { mergeDwellingArtifactLines } from "../src/lib/multi-boq/merge.ts";
import { composeDwellingOfferBoq } from "../src/lib/multi-boq/compose.ts";
import { enrichOfferBoqLinesWithQuantityIntelligence } from "../src/lib/intelligent-estimator/boq-quantity-intelligence.ts";
import { enrichOfferBoqLinesWithDependencyGraph } from "../src/lib/intelligent-estimator/boq-dependency-graph.ts";
import { resolveBoqPricingQuantity } from "../src/lib/intelligent-estimator/boq-pricing-quantity-resolver.ts";
import {
  synchronizeOfferBoqFromMasterLines,
  synchronizePackageOfferBoqsFromMasterLines,
} from "../src/lib/intelligent-estimator/boq-offer-master-sync.ts";
import { evaluateDwellingPositionCost } from "../src/lib/multi-dwelling/orchestration.ts";
import { computeShadowPositionCostForOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { loadWorkCatalogStoreLocal } from "../src/lib/work-catalog/work-catalog-store.ts";
import { assertMopsS1DiscoveryFrozenContract } from "../src/lib/intelligent-estimator/ik-mops-identity-bridge-audit.ts";
import { normalizeDwellingId } from "../src/lib/multi-dwelling/constants.ts";

let pass = 0;
let fail = 0;
function ok(name, cond) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name}`);
  }
}

function makeSnapshot(catalog) {
  return {
    ok: true,
    sourceFilename: "test.ath",
    parsedAt: "2026-08-26T00:00:00.000Z",
    rowCount: catalog.length,
    rows: [],
    catalogQuantities: catalog,
    warnings: [],
    quantityExpressionsByLp: Object.fromEntries(
      catalog
        .filter((c) => c.quantityExpressionRaw)
        .map((c) => [String(Number.parseInt(String(c.lp).replace(/\D/g, ""), 10) || c.lp), c.quantityExpressionRaw]),
    ),
  };
}

function makeArtifact(documentId, catalog) {
  return {
    documentId,
    artifactId: `art-${documentId}`,
    filename: `${documentId}.ath`,
    branchHint: "ogolnobudowlane",
    snapshot: makeSnapshot(catalog),
  };
}

// --- 1. MULTI-BOQ expression propagation ---
{
  const catalog = [
    {
      lp: "4",
      description: "Tynk",
      unit: "m2",
      quantity: "47.72",
      quantityExpressionRaw: "13,14 + 13,65 + 20,93",
    },
    {
      lp: "5",
      description: "Jak poz.4",
      unit: "m2",
      quantity: "47.72",
      quantityExpressionRaw: "poz.4",
    },
  ];
  const merged = mergeDwellingArtifactLines([makeArtifact("doc-a", catalog)]);
  ok("MB-01 merge completeness ready", merged.completeness === "ready");
  ok(
    "MB-02 merge keeps quantityExpressionRaw poz.4",
    merged.lines.find((l) => l.lp === "4")?.quantityExpressionRaw === "13,14 + 13,65 + 20,93",
  );
  ok(
    "MB-03 merge keeps quantityExpressionRaw poz.5",
    merged.lines.find((l) => l.lp === "5")?.quantityExpressionRaw === "poz.4",
  );
  ok(
    "MB-04 merge does not rewrite quantity",
    merged.lines.find((l) => l.lp === "4")?.quantity === 47.72,
  );

  const composed = composeDwellingOfferBoq({
    snapshot: {
      tenderId: "t-mb",
      dwellingId: "dw-a",
      sourceDocumentIds: ["doc-a"],
      sourceArtifactIds: ["art-doc-a"],
      lines: merged.lines,
      completeness: "ready",
      warnings: [],
    },
  });
  ok("MB-05 compose ok", composed.ok === true);
  const cLines = composed.ok ? composed.document.lines : [];
  const c4 = cLines.find((l) => l.lp === "4");
  const c5 = cLines.find((l) => l.lp === "5");
  ok("MB-06 compose quantityExpressionRaw", c4?.quantityExpressionRaw === "13,14 + 13,65 + 20,93");
  ok("MB-07 compose POSITION_REF expression", c5?.quantityExpressionRaw === "poz.4");
  ok("MB-08 compose line.quantity unchanged", c4?.quantity === 47.72 && c5?.quantity === 47.72);

  const qty = enrichOfferBoqLinesWithQuantityIntelligence(cLines);
  const semantic = enrichOfferBoqLinesWithDependencyGraph(qty);
  ok(
    "MB-09 S2 POSITION_REF on poz.5",
    semantic.lines.find((l) => l.lp === "5")?.quantityIntelligence?.expression?.kind === "POSITION_REF",
  );
  ok(
    "MB-10 S3 DEPENDS_ON / SAME_QUANTITY",
    (semantic.graph.relations ?? []).some(
      (r) => r.fromPositionNo === 5 && r.toPositionNo === 4,
    ),
  );
  ok(
    "MB-11 S2 does not mutate quantity",
    semantic.lines.every((l) => l.quantity === 47.72),
  );
}

// --- 2. OFFER BOQ SYNC ---
{
  const baseLines = [
    {
      lineId: "L4",
      lp: "4",
      description: "Tynk",
      quantity: 47.72,
      quantityRaw: "47.72",
      unit: "m2",
      quantityExpressionRaw: "13,14 + 13,65 + 20,93",
      catalogWorkId: null,
      workCategory: null,
      categoryId: null,
      isNoise: false,
      noiseKind: null,
      normalizedDescription: null,
      aliasRuleId: null,
      knrHint: null,
      catalogBasis: null,
      matchMethod: "snapshot",
      matchedBy: "snapshot",
      matchConfidence: "low",
      candidateMatches: [],
      costIntelligence: null,
      linePricing: null,
      materialUnitPln: null,
      materialCostPln: null,
      materialSource: { kind: "unknown", labelPl: "Brak" },
      laborRbh: null,
      laborRatePlnPerH: null,
      laborCostPln: null,
      laborSource: { kind: "unknown", labelPl: "Brak" },
      equipmentUnitPln: null,
      equipmentCostPln: null,
      equipmentSource: { kind: "unknown", labelPl: "Brak" },
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
    },
  ];
  const offerBoq = {
    schemaVersion: 5,
    tenderId: "t-sync",
    version: 1,
    builtAt: "2026-08-26T00:00:00.000Z",
    parserSnapshotRef: {
      kosztorysParsedAt: null,
      sourceFilename: null,
      rowCount: 1,
      pdfPrzedmiarCase: null,
    },
    lines: [...baseLines],
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
      lineCount: 1,
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
  };

  const enriched = enrichOfferBoqLinesWithQuantityIntelligence(baseLines);
  const master = [{ dwellingId: "legacy_single", line: enriched[0] }];
  const synced = synchronizeOfferBoqFromMasterLines(offerBoq, master);
  ok("SYNC-01 offerBoq line replaced", synced?.lines[0] === enriched[0]);
  ok(
    "SYNC-02 quantityIntelligence visible on offerBoq",
    synced?.lines[0]?.quantityIntelligence?.expression?.kind === "SUM",
  );
  ok("SYNC-03 line.quantity unchanged", synced?.lines[0]?.quantity === 47.72);

  const r = resolveBoqPricingQuantity({ line: synced.lines[0] });
  ok(
    "SYNC-04 resolver sees quantityIntelligence",
    r.status === "ACCEPTED" || r.status === "FALLBACK" || r.status === "HOLD",
  );
  ok("SYNC-05 resolver has resolvedTotal", r.resolvedTotal != null);
}

// --- 3. MULTI_PACKAGE GRAPH — no cross-dwelling LP collision ---
{
  function enrichDwelling(lines) {
    const qty = enrichOfferBoqLinesWithQuantityIntelligence(lines);
    return enrichOfferBoqLinesWithDependencyGraph(qty);
  }

  const linesA = [
    {
      lineId: "A-4",
      lp: "4",
      description: "A tynk",
      quantity: 10,
      quantityRaw: "10",
      unit: "m2",
      quantityExpressionRaw: "10",
    },
    {
      lineId: "A-5",
      lp: "5",
      description: "A jak 4",
      quantity: 10,
      quantityRaw: "10",
      unit: "m2",
      quantityExpressionRaw: "poz.4",
    },
  ].map((partial) => ({
    ...partial,
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint: null,
    catalogBasis: null,
    matchMethod: "snapshot",
    matchedBy: "snapshot",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "Brak" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "Brak" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "Brak" },
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
  }));

  const linesB = linesA.map((l) => ({
    ...l,
    lineId: l.lineId.replace("A-", "B-"),
    description: l.description.replace("A ", "B "),
    quantityExpressionRaw: l.lp === "5" ? "poz.99" : "10", // B: unresolved ref
  }));

  const semA = enrichDwelling(linesA);
  const semB = enrichDwelling(linesB);

  ok(
    "PKG-01 A graph has 5→4",
    semA.graph.relations.some((r) => r.fromPositionNo === 5 && r.toPositionNo === 4),
  );
  ok(
    "PKG-02 B unresolved does not pollute A",
    !semA.graph.unresolvedPositions.includes(5) || semA.graph.unresolvedPositions.length === 0
      ? !semA.graph.unresolvedPositions.includes(99)
      : true,
  );
  ok(
    "PKG-03 B has unresolved 99",
    semB.graph.unresolvedPositions.includes(99)
      || semB.lines.find((l) => l.lp === "5")?.quantityIntelligence?.unresolvedRefs?.includes(99),
  );
  ok(
    "PKG-04 A and B same lp keys scoped separately",
    semA.graph.positionIndex.some((p) => p.positionNo === 5)
      && semB.graph.positionIndex.some((p) => p.positionNo === 5)
      && semA.graph !== semB.graph,
  );

  const graphsByDwelling = {
    [normalizeDwellingId("dw-a")]: semA.graph,
    [normalizeDwellingId("dw-b")]: semB.graph,
  };

  const master = [
    ...semA.lines.map((line) => ({ dwellingId: "dw-a", line })),
    ...semB.lines.map((line) => ({ dwellingId: "dw-b", line })),
  ];

  const pkg = {
    schemaVersion: 1,
    tenderId: "t-pkg",
    mode: "multi",
    expectedDwellingCount: 2,
    dwellings: [
      {
        dwellingId: "dw-a",
        labelPl: "A",
        sourceDocumentIds: ["doc-a"],
        offerBoq: {
          schemaVersion: 5,
          tenderId: "t-pkg",
          version: 1,
          builtAt: "2026-08-26T00:00:00.000Z",
          parserSnapshotRef: {
            kosztorysParsedAt: null,
            sourceFilename: null,
            rowCount: 2,
            pdfPrzedmiarCase: null,
          },
          lines: linesA,
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
            lineCount: 2,
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
        lineProvenance: null,
        f5Gate: null,
        subtotals: null,
      },
      {
        dwellingId: "dw-b",
        labelPl: "B",
        sourceDocumentIds: ["doc-b"],
        offerBoq: {
          schemaVersion: 5,
          tenderId: "t-pkg",
          version: 1,
          builtAt: "2026-08-26T00:00:00.000Z",
          parserSnapshotRef: {
            kosztorysParsedAt: null,
            sourceFilename: null,
            rowCount: 2,
            pdfPrzedmiarCase: null,
          },
          lines: linesB,
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
            lineCount: 2,
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
        lineProvenance: null,
        f5Gate: null,
        subtotals: null,
      },
    ],
    updatedAt: "2026-08-26T00:00:00.000Z",
  };

  const syncedPkg = synchronizePackageOfferBoqsFromMasterLines(pkg, master);
  ok(
    "PKG-05 package sync A has intel",
    syncedPkg.dwellings[0].offerBoq.lines.find((l) => l.lp === "5")?.quantityIntelligence != null,
  );
  ok(
    "PKG-06 package sync B has intel",
    syncedPkg.dwellings[1].offerBoq.lines.find((l) => l.lp === "5")?.quantityIntelligence != null,
  );

  // POSITION_REF A: resolver with graph A
  const lineA5 = syncedPkg.dwellings[0].offerBoq.lines.find((l) => l.lp === "5");
  const rA = resolveBoqPricingQuantity({
    line: lineA5,
    dependencyGraph: graphsByDwelling[normalizeDwellingId("dw-a")],
  });
  ok(
    "PKG-07 A POSITION_REF not HOLD from B collision",
    rA.status !== "HOLD" || rA.holdReason !== "S3 upstream dependency unresolved",
  );

  // UPSTREAM UNRESOLVED B
  const lineB5 = syncedPkg.dwellings[1].offerBoq.lines.find((l) => l.lp === "5");
  const lineB5Identified = {
    ...lineB5,
    catalogWorkId: "cc-test-work",
    matchMethod: "exact_knr",
    matchedBy: "exact_knr",
    matchConfidence: "high",
  };
  const rB = resolveBoqPricingQuantity({
    line: lineB5,
    dependencyGraph: graphsByDwelling[normalizeDwellingId("dw-b")],
  });
  ok("PKG-08 B unresolved → HOLD", rB.status === "HOLD");
  ok("PKG-09 B gapCode BOQ_QUANTITY_HOLD", rB.gapCode === "BOQ_QUANTITY_HOLD");

  const store = loadWorkCatalogStoreLocal();
  const shadowB = computeShadowPositionCostForOfferBoqLine({
    line: lineB5Identified,
    store,
    nowMs: Date.now(),
    boqDependencyGraph: graphsByDwelling[normalizeDwellingId("dw-b")],
  });
  ok("PKG-10 B HOLD → BOQ_QUANTITY_HOLD gap", shadowB.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("PKG-11 B HOLD → no engineInput", shadowB.engineInput == null);

  // CYCLE in dwelling C
  const cycleLines = [
    {
      ...linesA[0],
      lineId: "C-10",
      lp: "10",
      quantityExpressionRaw: "poz.11",
      quantity: 1,
      quantityRaw: "1",
      catalogWorkId: "cc-test-work",
      matchMethod: "exact_knr",
      matchedBy: "exact_knr",
      matchConfidence: "high",
    },
    {
      ...linesA[1],
      lineId: "C-11",
      lp: "11",
      quantityExpressionRaw: "poz.10",
      quantity: 1,
      quantityRaw: "1",
      catalogWorkId: "cc-test-work",
      matchMethod: "exact_knr",
      matchedBy: "exact_knr",
      matchConfidence: "high",
    },
  ];
  const semC = enrichDwelling(cycleLines);
  ok("PKG-12 cycle detected", (semC.graph.cycles?.length ?? 0) > 0);
  const rCycle = resolveBoqPricingQuantity({
    line: semC.lines[0],
    dependencyGraph: semC.graph,
  });
  ok("PKG-13 cycle → HOLD", rCycle.status === "HOLD");
  const shadowCycle = computeShadowPositionCostForOfferBoqLine({
    line: semC.lines[0],
    store,
    nowMs: Date.now(),
    boqDependencyGraph: semC.graph,
  });
  ok("PKG-14 cycle → no engineInput", shadowCycle.engineInput == null);

  // evaluateDwellingPositionCost threads graph
  const offerBForEval = {
    ...syncedPkg.dwellings[1].offerBoq,
    lines: syncedPkg.dwellings[1].offerBoq.lines.map((l) =>
      l.lp === "5"
        ? {
            ...l,
            catalogWorkId: "cc-test-work",
            matchMethod: "exact_knr",
            matchedBy: "exact_knr",
            matchConfidence: "high",
          }
        : l,
    ),
  };
  const ev = evaluateDwellingPositionCost({
    tenderId: "t-pkg",
    dwellingId: "dw-b",
    offerBoq: offerBForEval,
    store,
    nowMs: Date.now(),
    ensureOwnerQuestions: false,
    boqDependencyGraph: graphsByDwelling[normalizeDwellingId("dw-b")],
  });
  ok(
    "PKG-15 evaluateDwelling threads graph HOLD",
    ev.shadow.lines.some((row) => row.gaps?.includes("BOQ_QUANTITY_HOLD")),
  );
}

// --- Frozen regression markers ---
{
  const frozen = assertMopsS1DiscoveryFrozenContract();
  ok("FROZEN-01 Phase 2D", frozen.phase2d);
  ok("FROZEN-02 Phase 2E", frozen.phase2e);
  ok("FROZEN-03 BY_FAMILY empty", Object.keys(frozen.byFamily ?? {}).length === 0);
  ok("FROZEN-04 EDGE empty", (frozen.edge ?? []).length === 0);
  ok("FROZEN-05 catalogVerified false", frozen.catalogVerifiedFalse === true);
}

console.log(`\n=== CONSUMPTION P0 SUMMARY: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
