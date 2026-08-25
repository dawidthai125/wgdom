/**
 * IK S4 — Expression source seam (S4-A) + Pricing quantity resolver (S4-B) harness.
 *
 * npx vite-node scripts/test-ik-boq-s4-expression-pricing.mjs
 */
import {
  assertMopsS1DiscoveryFrozenContract,
} from "../src/lib/intelligent-estimator/ik-mops-identity-bridge-audit.ts";
import {
  buildQuantityExpressionsByLpFromAthRows,
  resolveQuantityExpressionFromPrzedmiar,
} from "../src/lib/intelligent-estimator/boq-expression-source-seam.ts";
import {
  enrichOfferBoqLinesWithDependencyGraph,
} from "../src/lib/intelligent-estimator/boq-dependency-graph.ts";
import {
  enrichOfferBoqLinesWithQuantityIntelligence,
  parseQuantityExpression,
} from "../src/lib/intelligent-estimator/boq-quantity-intelligence.ts";
import { resolveBoqPricingQuantity } from "../src/lib/intelligent-estimator/boq-pricing-quantity-resolver.ts";
import { athPreviewToSnapshot } from "../src/lib/tenders-bzp-brief.ts";
import {
  buildOfferBoqFromSnapshot,
  parseOfferBoqQuantity,
} from "../src/lib/tender-offer-boq.ts";
import {
  computeShadowPositionCostForOfferBoqLine,
} from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { loadWorkCatalogStoreLocal } from "../src/lib/work-catalog/work-catalog-store.ts";

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

function structuralLine(tenderId, lp, description, unit, quantityRaw, quantityExpressionRaw) {
  const quantity = parseOfferBoqQuantity(quantityRaw);
  return {
    lineId: `test_${lp}`,
    lp: String(lp),
    description,
    quantity,
    quantityRaw,
    quantityExpressionRaw: quantityExpressionRaw ?? null,
    unit,
    catalogWorkId: "cc-test-work",
    workCategory: null,
    categoryId: null,
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
    pricingSourceLabelPl: "test",
    aiConfidence: "high",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
  };
}

console.log("=== IK S4 EXPRESSION + PRICING RESOLVER ===\n");

// A1 formula → quantityExpressionRaw via przedmiar helper
{
  const expr = resolveQuantityExpressionFromPrzedmiar([
    { quantity: "47.72", formula: "13,14 + 13,65 + 20,93" },
  ]);
  ok("A1 formula resolved", expr === "13,14 + 13,65 + 20,93");
}

// A2 poz.4 POSITION_REF source
{
  const expr = resolveQuantityExpressionFromPrzedmiar([{ quantity: "329.04", formula: "poz.4" }]);
  ok("A2 poz.4 expression", expr === "poz.4");
}

// A3 no formula — backward compatible
{
  const expr = resolveQuantityExpressionFromPrzedmiar([{ quantity: "3", formula: "3" }]);
  ok("A3 literal only null", expr == null);
}

// A4/A5 ingest + S2 order via buildOfferBoqFromSnapshot
{
  const preview = {
    ok: true,
    rows: [
      {
        lp: "3",
        code: "",
        description: "Rozebranie podłóg",
        unit: "m2",
        quantity: "47.72",
        unitPrice: "",
        total: "",
        przedmiar: [{ quantity: "47.72", formula: "13,14 + 13,65 + 20,93" }],
      },
      {
        lp: "4",
        code: "",
        description: "Gruntowanie",
        unit: "m2",
        quantity: "329.04",
        unitPrice: "",
        total: "",
        przedmiar: [{ quantity: "329.04", formula: "51,83 + 31,28" }],
      },
      {
        lp: "5",
        code: "",
        description: "Malowanie",
        unit: "m2",
        quantity: "329.04",
        unitPrice: "",
        total: "",
        przedmiar: [{ quantity: "329.04", formula: "poz.4" }],
      },
    ],
    categories: [],
    warnings: [],
    title: "test",
    totalValue: "",
    currency: "PLN",
  };
  const snapshot = athPreviewToSnapshot(preview, "test.ath");
  const doc = buildOfferBoqFromSnapshot({ tenderId: "t-s4", snapshot });
  const l3 = doc.lines.find((l) => l.lp === "3");
  const l5 = doc.lines.find((l) => l.lp === "5");
  ok("A4 line.quantity unchanged", l3?.quantity === 47.72 && l5?.quantity === 329.04);
  ok(
    "A1 snapshot quantityExpressionRaw",
    l3?.quantityExpressionRaw === "13,14 + 13,65 + 20,93"
      && l5?.quantityExpressionRaw === "poz.4",
  );

  let lines = doc.lines;
  const beforeQty = lines.map((l) => l.quantity);
  lines = enrichOfferBoqLinesWithQuantityIntelligence(lines);
  const l5intel = lines.find((l) => l.lp === "5");
  ok("A5 S2 after S4-A POSITION_REF", l5intel?.quantityIntelligence?.expression?.kind === "POSITION_REF");
  ok("A5 line.quantity still unchanged after S2", lines.every((l, i) => l.quantity === beforeQty[i]));

  const semantic = enrichOfferBoqLinesWithDependencyGraph(lines);
  const l5semantic = semantic.lines.find((l) => l.lp === "5");
  ok("S3 after S2 SAME_QUANTITY_AS", semantic.graph.relations.some(
    (r) => r.relation === "SAME_QUANTITY_AS" && r.fromPositionNo === 5 && r.toPositionNo === 4,
  ) || (l5semantic?.boqSemanticRelations?.some((r) => r.relation === "SAME_QUANTITY_AS") ?? false));
}

// B1 POSITION_REF AST
{
  const ast = parseQuantityExpression("poz.4");
  ok("B5 POSITION_REF AST", ast.kind === "POSITION_REF" && ast.positionNo === 4);
}

// D1 no metadata fallback
{
  const line = structuralLine("t", "1", "test", "m2", "10", null);
  const r = resolveBoqPricingQuantity({ line });
  ok("D1 no metadata fallback", r.status === "FALLBACK" && r.pricingQuantity === 10);
}

// D2 accepted resolved
{
  let line = structuralLine("t", "1", "test", "m2", "47.72", "13,14 + 13,65 + 20,93");
  [line] = enrichOfferBoqLinesWithQuantityIntelligence([line]);
  const r = resolveBoqPricingQuantity({ line });
  ok("D2 ACCEPTED resolved", r.status === "ACCEPTED" && r.pricingQuantity === 47.72);
}

// D3 material mismatch HOLD
{
  let line = structuralLine("t", "1", "test", "m2", "99", "13,14 + 13,65 + 20,93");
  [line] = enrichOfferBoqLinesWithQuantityIntelligence([line]);
  const r = resolveBoqPricingQuantity({ line });
  ok("D3 mismatch HOLD", r.status === "HOLD" && r.gapCode === "BOQ_QUANTITY_HOLD");
}

// D4 MULTIPLIER HOLD
{
  let line = structuralLine("t", "1", "Krotność = 2", "m2", "10", "Krotność = 2");
  [line] = enrichOfferBoqLinesWithQuantityIntelligence([line]);
  const r = resolveBoqPricingQuantity({ line });
  ok("D4 MULTIPLIER HOLD", r.status === "HOLD");
}

// D5 ANALOGY HOLD
{
  let line = structuralLine("t", "1", "analogia", "m2", "10", "10");
  line = {
    ...line,
    quantityIntelligence: {
      rawExpression: "10",
      expression: { kind: "LITERAL", value: 10, raw: "10" },
      resolvedTotal: 10,
      unresolvedRefs: [],
      dependencyPositions: [],
      evidence: {
        source: "EXPRESSION_RAW",
        computationType: "LITERAL",
        confidence: "high",
        dependencyPositions: [],
      },
      basisType: "ANALOGY",
      pricingHold: "REQUIRES_EXPERT",
      multiplierNote: null,
    },
  };
  const r = resolveBoqPricingQuantity({ line });
  ok("D5 ANALOGY HOLD", r.status === "HOLD");
}

// D8 UNRESOLVED HOLD
{
  let line = structuralLine("t", "1", "test", "m2", "10", "poz.99");
  [line] = enrichOfferBoqLinesWithQuantityIntelligence([line]);
  const r = resolveBoqPricingQuantity({ line });
  ok("D8 UNRESOLVED HOLD", r.status === "HOLD");
}

// E3 HOLD prevents costing (no engine input)
{
  let line = structuralLine("t", "1", "test", "m2", "99", "13,14 + 13,65 + 20,93");
  [line] = enrichOfferBoqLinesWithQuantityIntelligence([line]);
  const store = loadWorkCatalogStoreLocal();
  const shadow = computeShadowPositionCostForOfferBoqLine({
    line,
    store,
    nowMs: Date.now(),
  });
  ok("E3 HOLD gap in shadow", shadow.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("E3 no engine on HOLD", shadow.engineInput == null);
  ok("E4 offer line.quantity unchanged", line.quantity === 99);
}

// buildQuantityExpressionsByLpFromAthRows
{
  const map = buildQuantityExpressionsByLpFromAthRows([
    { lp: "7", przedmiar: [{ quantity: "1", formula: "poz.6" }] },
  ]);
  ok("A2 lp map", map["7"] === "poz.6");
}

// F frozen regression
{
  const frozen = assertMopsS1DiscoveryFrozenContract();
  ok("F1 Phase 2D", frozen.phase2d);
  ok("F2 Phase 2E", frozen.phase2e);
  ok("F4 BY_FAMILY empty", Object.keys(frozen.byFamily ?? {}).length === 0);
  ok("F5 EDGE empty", (frozen.edge ?? []).length === 0);
  ok("F6 catalogVerified false", frozen.catalogVerifiedFalse === true);
}

console.log(`\n=== S4 SUMMARY: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
