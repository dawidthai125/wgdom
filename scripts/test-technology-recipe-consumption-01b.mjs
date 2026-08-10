/**
 * TECHNOLOGY-RECIPE-CONSUMPTION-01B — Economy Interior White Paint
 * npx vite-node scripts/test-technology-recipe-consumption-01b.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  analyzeExecutionFromOfferBoq,
  analyzeTechnologyLineBindings,
  classifyCostItemFamily,
  defaultExecutionExpertBusinessProfile,
  resolvePaintCoats,
} from "../src/lib/execution-expert/index.ts";
import {
  canPackFeedProductionBom,
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  createNextVersion,
  deriveExecutionPlan,
  filterPackRecipeForCoats,
  FIXTURE_ETICS_PACK_ID,
  FIXTURE_KOSTKA_PACK_ID,
  FIXTURE_PAINTING_ECONOMY_PACK_ID,
  getPack,
  PAINTING_ECONOMY_FACTOR_1_COAT,
  PAINTING_ECONOMY_FACTOR_2_COATS,
  paintingEconomyWhitePackV1,
  projectBom,
  projectProductionBom,
  registerPack,
  seedB0Fixtures,
  transitionPackLifecycle,
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
    tenderId: "t-recipe-01b",
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

function paintLine(qty, description, lineId = "P1") {
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
function eq(name, a, b) {
  assert.equal(a, b, `${name}: ${a} !== ${b}`);
  passed += 1;
  console.log(`PASS ${name}`);
}

console.log("\n=== TECHNOLOGY-RECIPE-CONSUMPTION-01B ===\n");
resetTf();

eq("coats 2", resolvePaintCoats(paintLine(500, "Dwukrotne malowanie farbami emulsyjnymi")), 2);
eq("coats 1", resolvePaintCoats(paintLine(500, "Jednokrotne malowanie ścian emulsją")), 1);
eq("coats ambiguous null", resolvePaintCoats(paintLine(500, "Malowanie ścian farbami emulsyjnymi")), null);

// 1–3 quantity cases via binding + BOM
{
  const r1 = analyzeTechnologyLineBindings(
    baseDoc([paintLine(500, "Jednokrotne malowanie farbami emulsyjnymi")]),
  );
  eq("1 bound", r1.bindings[0].bindStatus, "bound");
  eq("1 coats", r1.bindings[0].coats, 1);
  const lit1 = r1.mergedBom.materials.find((m) => m.materialKey === "mat.farba_lateksowa_wewnetrzna");
  eq("1 litres 41.6665", lit1.quantity, 41.6665);

  const r2 = analyzeTechnologyLineBindings(
    baseDoc([paintLine(500, "Dwukrotne malowanie farbami emulsyjnymi")]),
  );
  eq("2 coats", r2.bindings[0].coats, 2);
  const lit2 = r2.mergedBom.materials.find((m) => m.materialKey === "mat.farba_lateksowa_wewnetrzna");
  eq("2 litres 83.3335", lit2.quantity, 83.3335);

  const r3 = analyzeTechnologyLineBindings(
    baseDoc([paintLine(100, "Dwukrotne malowanie ścian farbami emulsyjnymi")]),
  );
  const lit3 = r3.mergedBom.materials.find((m) => m.materialKey === "mat.farba_lateksowa_wewnetrzna");
  eq("3 litres 16.6667", lit3.quantity, 16.6667);
}

// 4 painting without ACTIVE pack / without deterministic coats → UNBOUND
{
  const amb = analyzeTechnologyLineBindings(
    baseDoc([paintLine(500, "Malowanie ścian farbami emulsyjnymi")]),
  );
  eq("4 unbound ambiguous", amb.bindings[0].bindStatus, "unbound");
  eq("4 no bom ambiguous", amb.mergedBom, null);

  // No ACTIVE painting pack: register APPROVED-only; seedB0 keeps existing 1.0
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  const { eticsPackV1, kostkaPackV1 } = await import("../src/lib/technology-foundation/fixtures.ts");
  const { seedBaselineCapabilities, registerCapability } = await import(
    "../src/lib/technology-foundation/definition-registry.ts"
  );
  const { registerDefinition } = await import(
    "../src/lib/technology-foundation/technology-definition.ts"
  );
  seedBaselineCapabilities();
  registerCapability({
    capabilityId: "cap.interior_painting",
    namePl: "Malowanie wnętrz",
  });
  registerDefinition({
    definitionId: "def.etics.standard",
    capabilityId: "cap.external_thermal_insulation",
    namePl: "ETICS",
  });
  registerDefinition({
    definitionId: "def.paving.cubes",
    capabilityId: "cap.paving_cubes",
    namePl: "Kostka",
  });
  registerDefinition({
    definitionId: "def.painting.economy_interior_white",
    capabilityId: "cap.interior_painting",
    namePl: "Paint",
  });
  registerPack(eticsPackV1());
  registerPack(kostkaPackV1());
  registerPack({
    ...paintingEconomyWhitePackV1(),
    lifecycle: "APPROVED",
  });
  const noActive = analyzeTechnologyLineBindings(
    baseDoc([paintLine(500, "Dwukrotne malowanie farbami emulsyjnymi")]),
  );
  eq("4 unbound no ACTIVE pack", noActive.bindings[0].bindStatus, "unbound");
  eq("4 no bom without ACTIVE", noActive.mergedBom, null);
  resetTf();
}

// 5 DRAFT pack → not production BOM
{
  const active = getPack(FIXTURE_PAINTING_ECONOMY_PACK_ID, "1.0");
  const draft = createNextVersion(active, { namePl: "draft paint" });
  ok("5 draft lifecycle", draft.lifecycle === "DRAFT");
  ok("5 draft cannot feed", !canPackFeedProductionBom(draft));
  assert.throws(
    () =>
      projectProductionBom(
        filterPackRecipeForCoats(draft, 2),
        deriveExecutionPlan(draft, { lines: [{ lineKey: "x", quantity: 10, unit: "m2" }] }),
        { lines: [{ lineKey: "x", quantity: 10, unit: "m2" }] },
      ),
    /production BOM/,
  );
  passed += 1;
  console.log("PASS 5 draft projectProductionBom throws");
}

// 6 APPROVED gate follows 01A — APPROVED cannot feed; missing provenance cannot APPROVE
{
  const bad = {
    ...paintingEconomyWhitePackV1(),
    packVersion: "9.9-test",
    lifecycle: "DRAFT",
    materials: [
      {
        materialKey: "mat.farba_lateksowa_wewnetrzna",
        namePl: "Farba",
        unit: "l",
        qtyFactor: 0.083333,
        coats: 1,
        factorSourceKind: "owner_approved",
        // missing ref + approvedAt
      },
    ],
  };
  const v = validateRecipeProvenance({ ...bad, lifecycle: "APPROVED" });
  ok(
    "6 missing provenance blocks",
    v.blockingIssues.some((i) => i.code.startsWith("RECIPE_FACTOR_NO_")),
  );
  const goodDraft = createNextVersion(getPack(FIXTURE_PAINTING_ECONOMY_PACK_ID, "1.0"), {});
  const review = transitionPackLifecycle(goodDraft, "REVIEW");
  const approved = transitionPackLifecycle(review, "APPROVED");
  eq("6 approved lifecycle", approved.lifecycle, "APPROVED");
  ok("6 approved cannot feed production", !canPackFeedProductionBom(approved));
}

// 7 ACTIVE + valid provenance → BOUND
{
  resetTf();
  const exec = analyzeExecutionFromOfferBoq(
    baseDoc([paintLine(500, "Dwukrotne malowanie farbami emulsyjnymi")]),
    defaultExecutionExpertBusinessProfile(),
  );
  ok("7 selection painting", exec.selection?.packId === FIXTURE_PAINTING_ECONOMY_PACK_ID);
  const lit = exec.bom.materials.find((m) => m.materialKey === "mat.farba_lateksowa_wewnetrzna");
  eq("7 litres", lit.quantity, 83.3335);
  ok("7 pack ACTIVE feed", canPackFeedProductionBom(getPack(FIXTURE_PAINTING_ECONOMY_PACK_ID, "1.0")));
}

// Factors locked
eq("factor 1 coat", PAINTING_ECONOMY_FACTOR_1_COAT, 0.083333);
eq("factor 2 coats", PAINTING_ECONOMY_FACTOR_2_COATS, 0.166667);

// 8–9 ETICS / paving regression
{
  const etics = analyzeExecutionFromOfferBoq(
    baseDoc([baseLine({ quantity: 120 })]),
    defaultExecutionExpertBusinessProfile(),
  );
  ok("8 etics pack", etics.selection?.packId === FIXTURE_ETICS_PACK_ID);
  ok("8 etics bom", etics.bom?.materials.some((m) => m.materialKey === "mat.eps_graph"));

  const pav = analyzeExecutionFromOfferBoq(
    baseDoc([
      baseLine({
        lineId: "K1",
        description: "Układanie kostki brukowej betonowej",
        catalogWorkId: "cw.paving.cubes",
        quantity: 40,
      }),
    ]),
    defaultExecutionExpertBusinessProfile(),
  );
  ok("9 paving pack", pav.selection?.packId === FIXTURE_KOSTKA_PACK_ID);
  ok("9 paving bom", pav.bom?.materials.some((m) => m.materialKey === "mat.cubes_beton"));
}

// 10–17 safety
{
  const root = process.cwd();
  const files = [
    "src/lib/execution-expert/paint-coats.ts",
    "src/lib/technology-foundation/painting-economy-white-v1.ts",
    "src/lib/technology-foundation/pack-recipe-coats.ts",
    "src/lib/execution-expert/technology-line-binding.ts",
  ];
  const blob = files
    .map((f) => fs.readFileSync(path.join(root, f), "utf8"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  ok("10 no PI writes", !/pushKeysToCloud|acceptManual|commitMarketQuotes/.test(blob));
  ok("11 no Purchase", !/acceptInvoicePurchase|saveCompanyKnowledgeStoreLocal/.test(blob));
  ok("12 no Market", !/publishMarketSync|commitMarketQuotes/.test(blob));
  ok("13 no SQL", !/\bpostgres\b|\bsqlite\b/.test(blob));
  ok("14 no HTTP", !/\bfetch\s*\(|axios/.test(blob));
  ok("15 no LLM/fuzzy", !/openai|embedding|fuzzyMatch|levenshtein/i.test(blob));
  ok("16 only existing materialKey", /mat\.farba_lateksowa_wewnetrzna/.test(blob));
  ok("16 no invent mat.paint", !/mat\.paint_economy|mat\.farba_eko_invent/.test(blob));
  const paintSrc = fs.readFileSync("src/lib/technology-foundation/painting-economy-white-v1.ts", "utf8");
  ok("17 no cw.product in paint pack", !/cw\.product\./.test(paintSrc));
}

// Direct projectBom factor check
{
  const pack = getPack(FIXTURE_PAINTING_ECONOMY_PACK_ID, "1.0");
  const ctx = { lines: [{ lineKey: "p", quantity: 500, unit: "m2" }] };
  const p1 = filterPackRecipeForCoats(pack, 1);
  const bom1 = projectBom(p1, deriveExecutionPlan(p1, ctx), ctx);
  eq("direct 1 coat qty", bom1.materials[0].quantity, 41.6665);
  const p2 = filterPackRecipeForCoats(pack, 2);
  const bom2 = projectBom(p2, deriveExecutionPlan(p2, ctx), ctx);
  eq("direct 2 coat qty", bom2.materials[0].quantity, 83.3335);
}

console.log(`\nALL PASS (${passed})\n`);
