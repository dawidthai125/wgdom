/**
 * IK S3 — BOQ Dependency Graph / Semantic Relation Layer harness.
 *
 * npx vite-node scripts/test-ik-boq-dependency-graph-s3.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertMopsS1DiscoveryFrozenContract,
  loadAllMopsBenchmarkFixtures,
  loadMopsBenchmarkFixture,
} from "../src/lib/intelligent-estimator/ik-mops-identity-bridge-audit.ts";
import {
  buildBoqDependencyGraph,
  getBoqIncomingRelations,
  getBoqOutgoingRelations,
} from "../src/lib/intelligent-estimator/boq-dependency-graph.ts";
import {
  parseQuantityExpression,
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

function mopsSemanticInputs(fixture) {
  const graphInputs = fixture.items.map((item) => ({
    positionNo: item.nr,
    rawExpression: mopsRawExpression(item),
    pdfQuantity: item.ilosc,
    description: item.opis,
    basisNotes: item.notes,
    podstawa: item.podstawa,
    department: item.dept,
    subsection: item.sub,
  }));
  const qty = resolveBoqQuantityGraph(graphInputs);
  return graphInputs.map((row) => ({
    positionNo: row.positionNo,
    description: row.description,
    unit: fixture.items.find((i) => i.nr === row.positionNo)?.jm ?? "",
    department: row.department,
    subsection: row.subsection,
    formula: row.rawExpression,
    quantityIntelligence: qty.get(row.positionNo) ?? null,
  }));
}

function hasRelation(graph, from, to, type) {
  return graph.relations.some(
    (r) => r.fromPositionNo === from && r.toPositionNo === to && r.relation === type,
  );
}

console.log("=== IK S3 BOQ DEPENDENCY GRAPH ===\n");

// S3-01 explicit POSITION_REF
{
  const qty = resolveBoqQuantityGraph([
    { positionNo: 5, rawExpression: "121,51" },
    { positionNo: 6, rawExpression: "poz.5" },
  ]);
  const g = buildBoqDependencyGraph([
    { positionNo: 5, quantityIntelligence: qty.get(5) ?? null },
    { positionNo: 6, quantityIntelligence: qty.get(6) ?? null },
  ]);
  ok("S3-01 POSITION_REF DEPENDS_ON", hasRelation(g, 6, 5, "DEPENDS_ON"));
  ok("S3-01 SAME_QUANTITY_AS", hasRelation(g, 6, 5, "SAME_QUANTITY_AS"));
  ok("S3-01 DERIVED_FROM", hasRelation(g, 6, 5, "DERIVED_FROM"));
}

// S3-02 chain 5→6→7/8 (Maślicka semantics)
{
  const fx = loadMopsBenchmarkFixture("maslicka-8a-5");
  const g = buildBoqDependencyGraph(mopsSemanticInputs(fx));
  ok("S3-02 chain 6→5", hasRelation(g, 6, 5, "SAME_QUANTITY_AS"));
  ok("S3-02 chain 7→6", hasRelation(g, 7, 6, "SAME_QUANTITY_AS"));
  ok("S3-02 chain 8→6", hasRelation(g, 8, 6, "SAME_QUANTITY_AS"));
  const deps7 = getBoqOutgoingRelations(g, 7).filter((r) => r.relation === "DEPENDS_ON");
  ok("S3-02 preserves direction 7→6", deps7.length === 1 && deps7[0].toPositionNo === 6);
  ok("S3-02 dependents of 6", getBoqIncomingRelations(g, 6).length >= 2);
}

// S3-03 Miernicza poz.5→4, poz.10→9
{
  const fx = loadMopsBenchmarkFixture("miernicza-15-7");
  const g = buildBoqDependencyGraph(mopsSemanticInputs(fx));
  ok("S3-03 Miernicza 5→4", hasRelation(g, 5, 4, "SAME_QUANTITY_AS"));
  ok("S3-03 Miernicza 10→9", hasRelation(g, 10, 9, "SAME_QUANTITY_AS"));
}

// S3-04 poz.66→77 DERIVED not SAME_QUANTITY
{
  const fx = loadMopsBenchmarkFixture("maslicka-8a-5");
  const g = buildBoqDependencyGraph(mopsSemanticInputs(fx));
  ok("S3-04 77 DERIVED_FROM 66", hasRelation(g, 77, 66, "DERIVED_FROM"));
  ok("S3-04 77 not SAME_QUANTITY", !hasRelation(g, 77, 66, "SAME_QUANTITY_AS"));
  ok("S3-04 78 SAME_QUANTITY 66", hasRelation(g, 78, 66, "SAME_QUANTITY_AS"));
}

// S3-05 unresolved ref
{
  const qty = resolveBoqQuantityGraph([{ positionNo: 1, rawExpression: "poz.99" }]);
  const g = buildBoqDependencyGraph([
    { positionNo: 1, quantityIntelligence: qty.get(1) ?? null },
  ]);
  ok("S3-05 unresolved position", g.unresolvedPositions.includes(1));
}

// S3-06 cycle
{
  const qty = resolveBoqQuantityGraph([
    { positionNo: 10, rawExpression: "poz.11" },
    { positionNo: 11, rawExpression: "poz.10" },
  ]);
  const g = buildBoqDependencyGraph([
    { positionNo: 10, quantityIntelligence: qty.get(10) ?? null },
    { positionNo: 11, quantityIntelligence: qty.get(11) ?? null },
  ]);
  ok("S3-06 cycle detected", g.cycles.length > 0);
  ok("S3-06 cycle positions unresolved", g.unresolvedPositions.includes(10));
}

// S3-07 evidence + state FACT on poz ref
{
  const fx = loadMopsBenchmarkFixture("maslicka-8a-5");
  const g = buildBoqDependencyGraph(mopsSemanticInputs(fx));
  const rel = g.relations.find((r) => r.fromPositionNo === 6 && r.toPositionNo === 5);
  ok("S3-07 evidence source AST", rel?.evidence.source === "QUANTITY_AST");
  ok("S3-07 state FACT", rel?.state === "FACT");
  ok("S3-07 confidence HIGH", rel?.evidence.confidence === "HIGH");
}

// S3-08 no false SAME_AREA_AS (equal qty 5/6 without explicit area text)
{
  const fx = loadMopsBenchmarkFixture("maslicka-8a-5");
  const g = buildBoqDependencyGraph(mopsSemanticInputs(fx));
  const sameArea = g.relations.filter((r) => r.relation === "SAME_AREA_AS");
  ok("S3-08 no false SAME_AREA_AS", sameArea.length === 0, `count=${sameArea.length}`);
}

// S3-09 no false REPLACES (sequential demontaż unrelated)
{
  const fx = loadMopsBenchmarkFixture("maslicka-8a-5");
  const g = buildBoqDependencyGraph(mopsSemanticInputs(fx));
  ok("S3-09 no REPLACES 4→5", !hasRelation(g, 5, 4, "REPLACES"));
  ok("S3-09 no REPLACES 1→2", !hasRelation(g, 2, 1, "REPLACES"));
}

// S3-10 explicit REPLACES wymiana (43 → demontaż 36)
{
  const fx = loadMopsBenchmarkFixture("maslicka-8a-5");
  const g = buildBoqDependencyGraph(mopsSemanticInputs(fx));
  const replaces = g.relations.filter((r) => r.relation === "REPLACES");
  ok("S3-10 has REPLACES edges", replaces.length > 0, `count=${replaces.length}`);
  const r43 = replaces.find((r) => r.fromPositionNo === 43);
  ok("S3-10 wymiana 43 FACT", r43?.state === "FACT" && r43.toPositionNo === 36);
}

// S3-11 MOPS fixtures aggregate
{
  const fixtures = loadAllMopsBenchmarkFixtures();
  let depEdges = 0;
  let posRefSameQty = 0;
  for (const fx of fixtures) {
    const g = buildBoqDependencyGraph(mopsSemanticInputs(fx));
    depEdges += g.relations.filter((r) => r.relation === "DEPENDS_ON").length;
    posRefSameQty += g.relations.filter((r) => r.relation === "SAME_QUANTITY_AS").length;
  }
  ok("S3-11 MOPS DEPENDS_ON edges", depEdges === 8, `edges=${depEdges}`);
  ok("S3-11 MOPS SAME_QUANTITY_AS", posRefSameQty >= 6, `count=${posRefSameQty}`);
}

// S3-12 graph not flattened — multi-hop via separate edges
{
  const fx = loadMopsBenchmarkFixture("maslicka-8a-5");
  const g = buildBoqDependencyGraph(mopsSemanticInputs(fx));
  ok("S3-12 no direct 7→5 flatten", !hasRelation(g, 7, 5, "DEPENDS_ON"));
  ok("S3-12 chain via 6 preserved", hasRelation(g, 7, 6, "DEPENDS_ON"));
}

// REG S2
{
  const g = resolveBoqQuantityGraph([{ positionNo: 1, rawExpression: "13,14 + 13,65 + 20,93" }]);
  ok("REG S2 SUM", (g.get(1)?.resolvedTotal ?? 0) > 47);
  ok("REG S2 parseOfferBoqQuantity", parseOfferBoqQuantity("2,0") === 2);
  ok("REG S2 LITERAL AST", parseQuantityExpression("3").kind === "LITERAL");
}

// REG frozen discovery
{
  const frozen = assertMopsS1DiscoveryFrozenContract();
  ok("REG 2D", frozen.phase2d);
  ok("REG 2E", frozen.phase2e);
  ok("REG BY_FAMILY {}", frozen.byFamilyEmpty);
  ok("REG Edge []", frozen.edgeEmpty);
  ok("REG catalogVerified false", frozen.catalogVerifiedFalse);
}

// REG no discovery mutation
{
  const selSrc = readFileSync(
    join(process.cwd(), "src/lib/intelligent-estimator/knr-knowledge/knr-discovery-source-selection.ts"),
    "utf8",
  );
  ok(
    "REG discovery frozen",
    selSrc.includes('"KNR-W|4-01|0701-05"')
      && selSrc.includes('"KNR-W|4-01|1202-07"')
      && selSrc.includes("Object.freeze({})"),
  );
}

console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
console.log("VERDICT:", fail === 0 ? "S3_IMPLEMENTED_READY_FOR_REVIEW" : "S3_BLOCKED");
process.exit(fail === 0 ? 0 : 1);
