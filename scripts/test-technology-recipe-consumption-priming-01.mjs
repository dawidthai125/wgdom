/**
 * TECHNOLOGY-RECIPE-CONSUMPTION-PRIMING-01 — Economy Interior Primer V1
 * npx vite-node scripts/test-technology-recipe-consumption-priming-01.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  analyzeTechnologyLineBindings,
  decomposeOfferBoqLine,
  resolvePrimingEconomyV1Eligibility,
} from "../src/lib/execution-expert/index.ts";
import {
  canPackFeedProductionBom,
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  createNextVersion,
  FIXTURE_ETICS_PACK_ID,
  FIXTURE_KOSTKA_PACK_ID,
  FIXTURE_PAINTING_ECONOMY_PACK_ID,
  FIXTURE_PRIMING_ECONOMY_PACK_ID,
  getPack,
  PRIMING_ECONOMY_FACTOR_1_COAT,
  PRIMING_ECONOMY_V1_SOURCE_REF,
  projectProductionBom,
  deriveExecutionPlan,
  registerPack,
  seedB0Fixtures,
  validateRecipeProvenance,
} from "../src/lib/technology-foundation/index.ts";

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

function baseLine(over = {}) {
  return {
    lineId: "L1",
    lp: "1",
    description: "Ocieplenie ścian zewnętrznych systemem ETICS",
    quantity: 120,
    quantityRaw: "120",
    unit: "m2",
    catalogWorkId: "cw.etics.boards",
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    ...over,
  };
}

function baseDoc(lines) {
  return {
    schemaVersion: 5,
    tenderId: "t-recipe-priming-01",
    version: 1,
    builtAt: new Date().toISOString(),
    parserSnapshotRef: {
      kosztorysParsedAt: null,
      sourceFilename: null,
      rowCount: lines.length,
      pdfPrzedmiarCase: null,
    },
    lines,
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
      lineCount: lines.length,
      pricedLineCount: 0,
    },
    recomputeToken: "x",
    buildStatus: "mapped",
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: [],
  };
}

function primingLine(qty, description, lineId = "PR1") {
  return baseLine({
    lineId,
    description,
    catalogWorkId: null,
    quantity: qty,
    unit: "m2",
  });
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

function gruntLitres(bom) {
  const row = (bom?.materials || []).find((m) => m.materialKey === "mat.grunt");
  return row ? Number(row.quantity) : null;
}

function paintLitres(bom) {
  const row = (bom?.materials || []).find(
    (m) => m.materialKey === "mat.farba_lateksowa_wewnetrzna",
  );
  return row ? Number(row.quantity) : null;
}

resetTf();

// --- Factor lock ---
ok("factor 0.10", PRIMING_ECONOMY_FACTOR_1_COAT === 0.1);
ok(
  "source ref points to SOURCE RESEARCH PRIMING",
  String(PRIMING_ECONOMY_V1_SOURCE_REF).includes(
    "TECHNOLOGY-RECIPE-SOURCE-RESEARCH-PRIMING-01.md",
  ),
);

// 1–5 valid priming + quantities + coats
{
  const cases = [
    [100, 10],
    [250, 25],
    [500, 50],
  ];
  for (const [qty, expectL] of cases) {
    const doc = baseDoc([
      primingLine(qty, "Gruntowanie podłoży preparatami - powierzchnie pionowe", `Q${qty}`),
    ]);
    const r = analyzeTechnologyLineBindings(doc);
    const b = r.bindings.find((x) => x.costItemFamily === "priming");
    ok(`${qty}m2 bound`, b?.bindStatus === "bound");
    ok(`${qty}m2 coats=1`, b?.coats === 1);
    ok(`${qty}m2 pack`, b?.packId === FIXTURE_PRIMING_ECONOMY_PACK_ID);
    ok(`${qty}m2 → ${expectL} L`, gruntLitres(r.mergedBom) === expectL);
  }
}

// 6 ambiguous / missing safe class → UNBOUND
{
  ok(
    "ambiguous bare gruntowanie unbound eligibility",
    resolvePrimingEconomyV1Eligibility({
      description: "Gruntowanie",
      lineId: "A1",
      quantity: 10,
      unit: "m2",
    }) === "unbound",
  );
  const doc = baseDoc([primingLine(50, "Gruntowanie", "AMB")]);
  const r = analyzeTechnologyLineBindings(doc);
  const b = r.bindings.find((x) => x.lineId === "AMB" && x.costItemFamily === "priming");
  ok("ambiguous → UNBOUND bind", !b || b.bindStatus === "unbound");
  ok("ambiguous → no grunt BOM", gruntLitres(r.mergedBom) == null);
}

// 7 CT17
{
  const desc =
    'Gruntowanie podłoży preparatami "CERESIT CT 17" - powierzchnie pionowe';
  ok("CT17 eligibility unbound", resolvePrimingEconomyV1Eligibility({ description: desc }) === "unbound");
  const r = analyzeTechnologyLineBindings(baseDoc([primingLine(100, desc, "CT")]));
  ok("CT17 → UNBOUND", r.bindings.every((b) => b.bindStatus !== "bound" || b.packId !== FIXTURE_PRIMING_ECONOMY_PACK_ID));
  ok("CT17 → no mat.grunt", gruntLitres(r.mergedBom) == null);
}

// 8 Atlas Uni-Grunt
{
  const desc = "Gruntowanie podłoży preparatami ATLAS UNI GRUNT - powierzchnie pionowe";
  ok("Atlas eligibility unbound", resolvePrimingEconomyV1Eligibility({ description: desc }) === "unbound");
  const r = analyzeTechnologyLineBindings(baseDoc([primingLine(80, desc, "AT")]));
  ok("Atlas → no mat.grunt", gruntLitres(r.mergedBom) == null);
}

// 9 deep primer
{
  const desc = "Gruntowanie podłoży gruntem głęboko penetrującym";
  ok("deep eligibility unbound", resolvePrimingEconomyV1Eligibility({ description: desc }) === "unbound");
  const r = analyzeTechnologyLineBindings(baseDoc([primingLine(40, desc, "DP")]));
  ok("deep → no mat.grunt", gruntLitres(r.mergedBom) == null);
}

// 10 hydro
{
  const desc = "Przygotowanie powierzchni poziomych pod uszczelnienia - gruntowanie";
  ok("hydro eligibility unbound", resolvePrimingEconomyV1Eligibility({ description: desc }) === "unbound");
  const r = analyzeTechnologyLineBindings(baseDoc([primingLine(10, desc, "HY")]));
  ok("hydro → no mat.grunt", gruntLitres(r.mergedBom) == null);
}

// 11 primer under plaster
{
  const desc = "Gruntowanie podłoży preparatami-pod tynk";
  ok("pod tynk unbound", resolvePrimingEconomyV1Eligibility({ description: desc }) === "unbound");
  const r = analyzeTechnologyLineBindings(baseDoc([primingLine(133, desc, "TY")]));
  ok("pod tynk → no mat.grunt", gruntLitres(r.mergedBom) == null);
}

// 12 double priming
{
  const desc = "Dwukrotne gruntowanie podłoży preparatami - powierzchnie pionowe";
  ok("double priming unbound", resolvePrimingEconomyV1Eligibility({ description: desc }) === "unbound");
  const r = analyzeTechnologyLineBindings(baseDoc([primingLine(100, desc, "2X")]));
  ok("double → no mat.grunt", gruntLitres(r.mergedBom) == null);
}

// 13 painting + priming → 2 TechUnits
{
  const desc =
    "Dwukrotne malowanie powierzchni wewnętrznych-tynków mineralnych z jednokrotnym gruntowaniem";
  const line = primingLine(100, desc, "COMP");
  const decomp = decomposeOfferBoqLine(line);
  const fams = decomp.units.map((u) => u.family).sort();
  ok("compound has priming", fams.includes("priming"));
  ok("compound has painting", fams.includes("painting"));
  ok("compound N>=2", decomp.units.length >= 2);
  const r = analyzeTechnologyLineBindings(baseDoc([line]));
  const boundPrim = r.bindings.filter(
    (b) => b.bindStatus === "bound" && b.packId === FIXTURE_PRIMING_ECONOMY_PACK_ID,
  );
  const boundPaint = r.bindings.filter(
    (b) => b.bindStatus === "bound" && b.packId === FIXTURE_PAINTING_ECONOMY_PACK_ID,
  );
  ok("compound priming BOUND", boundPrim.length === 1);
  ok("compound painting BOUND", boundPaint.length === 1);
  ok("compound grunt 10 L", gruntLitres(r.mergedBom) === 10);
  ok("compound paint present", paintLitres(r.mergedBom) != null && paintLitres(r.mergedBom) > 0);
  const gruntRow = r.mergedBom.materials.find((m) => m.materialKey === "mat.grunt");
  ok(
    "decomp provenance techUnitIds on grunt",
    Array.isArray(gruntRow?.techUnitIds) && gruntRow.techUnitIds.length >= 1,
  );
  ok(
    "decomp provenance sourceLineIds on grunt",
    Array.isArray(gruntRow?.sourceLineIds) && gruntRow.sourceLineIds.includes("COMP"),
  );
}

// 14 painting-only regression (bez gruntowania)
{
  const desc =
    "Malowanie tynków wewnętrznych gładkich farbą emulsyjną dwukrotnie bez gruntowania - klatki schodowe";
  const line = primingLine(100, desc, "PO");
  const decomp = decomposeOfferBoqLine(line);
  ok(
    "bez gruntowania → no priming TechUnit",
    !decomp.units.some((u) => u.family === "priming"),
  );
  const r = analyzeTechnologyLineBindings(baseDoc([line]));
  ok("painting-only no mat.grunt", gruntLitres(r.mergedBom) == null);
  ok(
    "painting-only has paint",
    paintLitres(r.mergedBom) != null && paintLitres(r.mergedBom) > 0,
  );
}

// 15 ACTIVE / provenance gate
{
  resetTf();
  const pack = getPack(FIXTURE_PRIMING_ECONOMY_PACK_ID, "1.0");
  ok("pack ACTIVE", pack?.lifecycle === "ACTIVE");
  ok("can feed production BOM", canPackFeedProductionBom(pack));
  const prov = validateRecipeProvenance(pack);
  ok(
    "provenance validate",
    Array.isArray(prov.blockingIssues) && prov.blockingIssues.length === 0,
  );

  // DRAFT cannot feed
  const draft = {
    ...pack,
    packVersion: "9.9-draft-test",
    lifecycle: "DRAFT",
  };
  // register as DRAFT via transition path: register then ensure not feedable
  registerPack({ ...draft, lifecycle: "DRAFT" });
  const d = getPack(FIXTURE_PRIMING_ECONOMY_PACK_ID, "9.9-draft-test");
  ok("DRAFT not production feedable", d && !canPackFeedProductionBom(d));
}

// 16–17 no new materialKey / CatalogWork in allowlisted implement files
{
  const roots = [
    "src/lib/technology-foundation/priming-economy-interior-v1.ts",
    "src/lib/execution-expert/priming-eligibility.ts",
    "src/lib/execution-expert/technology-line-binding.ts",
  ];
  for (const rel of roots) {
    const abs = path.join(process.cwd(), rel);
    const src = fs.readFileSync(abs, "utf8");
    ok(`${rel} uses mat.grunt`, /mat\.grunt/.test(src) || !/priming-economy/.test(rel) || /mat\.grunt/.test(src));
    ok(`${rel} no mat.grunt_new invent`, !/mat\.grunt_[a-z0-9]+/.test(src));
  }
  const packSrc = fs.readFileSync(
    path.join(process.cwd(), "src/lib/technology-foundation/priming-economy-interior-v1.ts"),
    "utf8",
  );
  ok("pack materialKey is mat.grunt only", /materialKey:\s*"mat\.grunt"/.test(packSrc));
  ok("no new CatalogWork product seed", !/cw\.product\.grunt_v2|cw\.priming\.new/.test(packSrc));
}

// 18 no PI/Purchase/Market writes in priming files
{
  const files = [
    "src/lib/technology-foundation/priming-economy-interior-v1.ts",
    "src/lib/execution-expert/priming-eligibility.ts",
  ];
  for (const rel of files) {
    const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    ok(
      `${rel} no write APIs`,
      !/batch-set|kv_store|purchaseWrite|marketWrite|fetch\(/i.test(src),
    );
  }
}

// 19–20 ETICS / kostka regression
{
  resetTf();
  const etics = analyzeTechnologyLineBindings(
    baseDoc([
      baseLine({
        lineId: "E1",
        description: "Ocieplenie ścian zewnętrznych systemem ETICS",
        catalogWorkId: "cw.etics.boards",
        quantity: 100,
      }),
    ]),
  );
  ok(
    "etics still binds",
    etics.bindings.some(
      (b) => b.bindStatus === "bound" && b.packId === FIXTURE_ETICS_PACK_ID,
    ),
  );
  const kostka = analyzeTechnologyLineBindings(
    baseDoc([
      baseLine({
        lineId: "K1",
        description: "Nawierzchnie z kostki brukowej betonowej",
        catalogWorkId: "cw.paving.cubes",
        quantity: 50,
      }),
    ]),
  );
  ok(
    "kostka still binds",
    kostka.bindings.some(
      (b) => b.bindStatus === "bound" && b.packId === FIXTURE_KOSTKA_PACK_ID,
    ),
  );
}

// projectProductionBom direct qty check
{
  resetTf();
  const pack = getPack(FIXTURE_PRIMING_ECONOMY_PACK_ID, "1.0");
  const ctx = {
    lines: [
      {
        lineKey: "boq.prime",
        catalogWorkIdHint: "legacy-gruntowanie-m2",
        quantity: 250,
        unit: "m2",
      },
    ],
  };
  const plan = deriveExecutionPlan(pack, ctx);
  const bom = projectProductionBom(pack, plan, ctx);
  ok("direct projectBom 250→25", gruntLitres(bom) === 25);
}

// TF-8 immutability smoke (next version ≠ mutate 1.0 factor)
{
  resetTf();
  const pack = getPack(FIXTURE_PRIMING_ECONOMY_PACK_ID, "1.0");
  const next = createNextVersion(pack, {
    materials: pack.materials.map((m) => ({ ...m, qtyFactor: 0.2 })),
  });
  ok("next version id bumped", next.packVersion !== "1.0");
  const still = getPack(FIXTURE_PRIMING_ECONOMY_PACK_ID, "1.0");
  ok("1.0 factor immutable", still.materials[0].qtyFactor === 0.1);
}

console.log(`\nPRIMING-01 PASS ${passed}`);
