/**
 * IK S2 — BOQ Quantity Intelligence regression (unit + MOPS fixture + frozen discovery).
 *
 * npx vite-node scripts/test-ik-boq-quantity-intelligence-s2.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertMopsS1DiscoveryFrozenContract,
  loadAllMopsBenchmarkFixtures,
} from "../src/lib/intelligent-estimator/ik-mops-identity-bridge-audit.ts";
import {
  classifyQuantityBasisType,
  enrichOfferBoqLinesWithQuantityIntelligence,
  parseQuantityExpression,
  quantitiesRoughlyEqual,
  resolveBoqQuantityGraph,
} from "../src/lib/intelligent-estimator/boq-quantity-intelligence.ts";
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

/** MOPS fixture-only: stitch split calc/opis rows (not production runtime). */
function mopsRawExpression(item) {
  let calc = String(item.calc ?? "").trim();
  const opis = String(item.opis ?? "").trim();
  if (calc.includes("(") && !calc.includes(")") && opis.includes(")")) {
    const closeIdx = opis.indexOf(")");
    const tail = opis.slice(0, closeIdx + 1);
    const mathStart = tail.search(/\d[\d,.\s]*\s*[\*+\-]/);
    if (mathStart >= 0) calc = `${calc}${tail.slice(mathStart)}`;
  }
  if (calc.startsWith("[") && !calc.includes("]") && opis.includes("]")) {
    const m = opis.match(/(\+[\d,.\s+]+\])\s*(\*\s*[\d,.]+)?\s*$/);
    if (m) calc = `${calc}${m[1]}${m[2] ?? ""}`;
  }
  return calc || opis;
}

function mopsGraphInputs(fixture) {
  return fixture.items.map((item) => ({
    positionNo: item.nr,
    rawExpression: mopsRawExpression(item),
    pdfQuantity: item.ilosc,
    description: item.opis,
    basisNotes: item.notes,
    podstawa: item.podstawa,
  }));
}

console.log("=== IK S2 BOQ QUANTITY INTELLIGENCE ===\n");

// U01 LITERAL
{
  const ast = parseQuantityExpression("13,14");
  ok("U01 LITERAL kind", ast.kind === "LITERAL" && ast.value === 13.14);
}

// U02 SUM
{
  const ast = parseQuantityExpression("13,14 + 13,65 + 20,93");
  const g = resolveBoqQuantityGraph([{ positionNo: 1, rawExpression: "13,14 + 13,65 + 20,93" }]);
  ok("U02 SUM kind", ast.kind === "SUM");
  ok("U02 SUM total", quantitiesRoughlyEqual(g.get(1)?.resolvedTotal ?? 0, 47.72));
}

// U03 PRODUCT
{
  const g = resolveBoqQuantityGraph([{ positionNo: 1, rawExpression: "1,98 * 0,75 * 4" }]);
  ok("U03 PRODUCT", quantitiesRoughlyEqual(g.get(1)?.resolvedTotal ?? 0, 5.94));
}

// U04 nested PRODUCT
{
  const g = resolveBoqQuantityGraph([{ positionNo: 1, rawExpression: "(0,15 * 1,2) * 2" }]);
  ok("U04 nested PRODUCT", quantitiesRoughlyEqual(g.get(1)?.resolvedTotal ?? 0, 0.36));
}

// U05 BRACKET_EXPR structure
{
  const ast = parseQuantityExpression("[6,55 + 9,47 + 5,56 + 3,8 + 4,32]");
  ok("U05 BRACKET_EXPR", ast.kind === "BRACKET_EXPR" || ast.kind === "SUM");
}

// U06 POSITION_REF
{
  const ast = parseQuantityExpression("poz.5");
  ok("U06 POSITION_REF kind", ast.kind === "POSITION_REF" && ast.positionNo === 5);
}

// U07 dependency chain 5→6→7/8 (Maślicka)
{
  const fx = loadAllMopsBenchmarkFixtures().find((f) => f.fixtureId === "maslicka-8a-5");
  const inputs = mopsGraphInputs(fx);
  const g = resolveBoqQuantityGraph(inputs);
  const p5 = g.get(5)?.resolvedTotal;
  const p6 = g.get(6)?.resolvedTotal;
  const p7 = g.get(7)?.resolvedTotal;
  const p8 = g.get(8)?.resolvedTotal;
  ok("U07 chain p5", quantitiesRoughlyEqual(p5 ?? 0, 121.51), `got=${p5}`);
  ok("U07 chain p6=p5", quantitiesRoughlyEqual(p6 ?? 0, p5 ?? -1), `p6=${p6}`);
  ok("U07 chain p7=p6", quantitiesRoughlyEqual(p7 ?? 0, p6 ?? -1), `p7=${p7}`);
  ok("U07 chain p8=p6", quantitiesRoughlyEqual(p8 ?? 0, p6 ?? -1), `p8=${p8}`);
}

// U08 cycle detection
{
  const g = resolveBoqQuantityGraph([
    { positionNo: 10, rawExpression: "poz.11" },
    { positionNo: 11, rawExpression: "poz.10" },
  ]);
  ok("U08 cycle p10", g.get(10)?.evidence.unresolvedReason === "CYCLE");
  ok("U08 cycle p11", g.get(11)?.evidence.unresolvedReason === "CYCLE");
}

// U09 unresolved ref
{
  const g = resolveBoqQuantityGraph([{ positionNo: 1, rawExpression: "poz.99" }]);
  ok("U09 unresolved ref", (g.get(1)?.unresolvedRefs ?? []).includes(99));
}

// U10 MULTIPLIER metadata (no auto-apply)
{
  const g = resolveBoqQuantityGraph([
    {
      positionNo: 6,
      rawExpression: "poz.5",
      description: "Gruntowanie podłoży - powierzchnie pionowe 1134-02 Krotność = 2",
    },
    { positionNo: 5, rawExpression: "121,51" },
  ]);
  ok("U10 multiplier note", g.get(6)?.multiplierNote?.value === 2);
  ok("U10 multiplier not applied", quantitiesRoughlyEqual(g.get(6)?.resolvedTotal ?? 0, 121.51));
}

// U11 ROOM_TAG metadata
{
  const ast = parseQuantityExpression("<kuchnia> 1,98 * 0,75 * 4");
  ok("U11 ROOM_SCOPED", ast.kind === "ROOM_SCOPED" && (ast.roomNames ?? []).includes("kuchnia"));
}

// U12 basis ANALOGY hold
{
  const basis = classifyQuantityBasisType("KNR 9-29 / 0211-01", ["analogia"], "Demontaż");
  const g = resolveBoqQuantityGraph([
    {
      positionNo: 1,
      rawExpression: "2,0",
      podstawa: "KNR 9-29 / 0211-01",
      basisNotes: ["analogia"],
      description: "Demontaż",
    },
  ]);
  ok("U12 ANALOGY basis", basis === "ANALOGY");
  ok("U12 ANALOGY hold", g.get(1)?.pricingHold === "REQUIRES_EXPERT");
}

// U13 parseOfferBoqQuantity regression
ok(
  "U13 parseOfferBoqQuantity",
  parseOfferBoqQuantity("13,14") === 13.14 && parseOfferBoqQuantity("poz.5") === 0,
);

// U14 enrich OfferBoqLine
{
  const enriched = enrichOfferBoqLinesWithQuantityIntelligence([
    {
      lineId: "t1",
      lp: "3",
      description: "test",
      quantity: 47.72,
      quantityRaw: "13,14 + 13,65 + 20,93",
      unit: "m2",
      catalogWorkId: null,
      workCategory: null,
      categoryId: null,
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
      materialSource: { kind: "unknown", labelPl: "x" },
      laborRbh: null,
      laborRatePlnPerH: null,
      laborCostPln: null,
      laborSource: { kind: "unknown", labelPl: "x" },
      equipmentUnitPln: null,
      equipmentCostPln: null,
      equipmentSource: { kind: "unknown", labelPl: "x" },
      directCostPln: null,
      kpPln: null,
      overheadSharePln: null,
      marginPln: null,
      lineTotalPln: null,
      athUnitPricePln: null,
      athTotalPln: null,
      pricingSourceLabelPl: "x",
      aiConfidence: "low",
      aiRationale: null,
      userEdited: false,
      editedFields: [],
      warnings: [],
    },
  ]);
  ok(
    "U14 enrich metadata",
    enriched[0]?.quantityIntelligence?.resolvedTotal === 47.72
      || quantitiesRoughlyEqual(enriched[0]?.quantityIntelligence?.resolvedTotal ?? 0, 47.72),
  );
}

// I01 MOPS 165 analyzable
{
  const fixtures = loadAllMopsBenchmarkFixtures();
  const total = fixtures.reduce((s, f) => s + f.items.length, 0);
  let analyzed = 0;
  let matched = 0;
  const mismatches = [];
  for (const fx of fixtures) {
    const g = resolveBoqQuantityGraph(mopsGraphInputs(fx));
    for (const item of fx.items) {
      const intel = g.get(item.nr);
      if (intel && intel.expression.kind !== "UNRESOLVED") analyzed += 1;
      if (intel?.resolvedTotal != null && quantitiesRoughlyEqual(intel.resolvedTotal, item.ilosc)) {
        matched += 1;
      } else if (intel) {
        mismatches.push({ nr: item.nr, fx: fx.fixtureId, got: intel.resolvedTotal, want: item.ilosc });
      }
    }
  }
  ok("I01 MOPS total=165", total === 165, `total=${total}`);
  ok("I01 MOPS analyzable", analyzed === 165, `analyzed=${analyzed}`);
  ok("I01 MOPS totals match", matched >= 155, `matched=${matched} sample=${JSON.stringify(mismatches.slice(0, 3))}`);
}

// I02 frozen discovery contract (Phase 2D/2E)
{
  const frozen = assertMopsS1DiscoveryFrozenContract();
  ok("I02 Phase 2D", frozen.phase2d);
  ok("I03 Phase 2E", frozen.phase2e);
  ok("I04 BY_FAMILY {}", frozen.byFamilyEmpty);
  ok("I05 Edge []", frozen.edgeEmpty);
  ok("I06 catalogVerified false", frozen.catalogVerifiedFalse);
}

// I07 no discovery mutation spot-check
{
  const selSrc = readFileSync(
    join(process.cwd(), "src/lib/intelligent-estimator/knr-knowledge/knr-discovery-source-selection.ts"),
    "utf8",
  );
  ok(
    "I07 discovery frozen",
    selSrc.includes('"KNR-W|4-01|0701-05"')
      && selSrc.includes('"KNR-W|4-01|1202-07"')
      && selSrc.includes("Object.freeze({})"),
  );
}

console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
console.log("VERDICT:", fail === 0 ? "S2_IMPLEMENTED_READY_FOR_REVIEW" : "S2_BLOCKED");
process.exit(fail === 0 ? 0 : 1);
