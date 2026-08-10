/**
 * TECHNOLOGY-RECIPE-CONSUMPTION-01A — Recipe Provenance Infrastructure
 * npx vite-node scripts/test-technology-recipe-consumption-01a.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  analyzeExecutionFromOfferBoq,
  analyzeTechnologyLineBindings,
  classifyCostItemFamily,
  defaultExecutionExpertBusinessProfile,
} from "../src/lib/execution-expert/index.ts";
import {
  attemptEditPackInPlace,
  canPackFeedProductionBom,
  canPromoteToApproved,
  canTransitionLifecycle,
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  createNextVersion,
  deriveExecutionPlan,
  eticsBoqContext,
  FIXTURE_ETICS_PACK_ID,
  FIXTURE_KOSTKA_PACK_ID,
  getPack,
  normalizeTechnologyPack,
  projectBom,
  projectProductionBom,
  registerPack,
  seedB0Fixtures,
  transitionPackLifecycle,
  validateRecipeProvenance,
  withLegacyFixtureProvenance,
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
    tenderId: "t-recipe-01a",
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

/** Minimal structural pack for provenance tests (not painting production). */
function makeDraftPack(materials, lifecycle = "DRAFT") {
  return normalizeTechnologyPack({
    packId: "pack.test.provenance",
    packVersion: "1.0",
    definitionId: "def.etics.standard",
    packCapabilities: ["cap.external_thermal_insulation"],
    lifecycle,
    namePl: "Test provenance pack",
    stages: [{ stageId: "s1", order: 1, namePl: "S1" }],
    steps: [
      {
        stepId: "st1",
        stageId: "s1",
        order: 1,
        namePl: "Step",
        catalogWorkId: "cw.etics.boards",
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials,
    equipment: [],
    labour: [],
    regulatory: [],
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

console.log("\n=== TECHNOLOGY-RECIPE-CONSUMPTION-01A ===\n");
resetTf();

// 1 provenance fields accepted
{
  const etics = getPack(FIXTURE_ETICS_PACK_ID, "1.0");
  ok("1 etics loaded", !!etics);
  const m = etics.materials[0];
  eq("1 factorSourceKind fixture_legacy", m.factorSourceKind, "fixture_legacy");
  eq("1 wastePolicy included", m.wastePolicy, "included_in_factor");
  ok("1 qtyFactor preserved", typeof m.qtyFactor === "number" && m.qtyFactor > 0);
}

// 2 missing source rejected for approval
{
  const pack = makeDraftPack([
    {
      materialKey: "mat.eps_graph",
      namePl: "EPS",
      unit: "m2",
      qtyFactor: 1.05,
      factorSourceKind: "owner_approved",
      // missing factorSourceRef + factorApprovedAt
    },
  ]);
  ok("2 cannot promote APPROVED", !canPromoteToApproved(pack));
  const v = validateRecipeProvenance({ ...pack, lifecycle: "APPROVED" });
  ok(
    "2 missing source codes",
    v.blockingIssues.some((i) => i.code === "RECIPE_FACTOR_NO_SOURCE_REF") &&
      v.blockingIssues.some((i) => i.code === "RECIPE_FACTOR_NO_APPROVED_AT"),
  );
  assert.throws(
    () => transitionPackLifecycle(pack, "APPROVED"),
    /APPROVED/,
    "2 transition APPROVED throws",
  );
  passed += 1;
  console.log("PASS 2 transition APPROVED throws");
}

// 3 DRAFT cannot feed production BOM
{
  const draft = createNextVersion(getPack(FIXTURE_ETICS_PACK_ID, "1.0"), {
    namePl: "draft next",
  });
  eq("3 draft lifecycle", draft.lifecycle, "DRAFT");
  ok("3 draft cannot feed", !canPackFeedProductionBom(draft));
}

// 4 REVIEW cannot feed / cannot jump to ACTIVE without legacy-only or APPROVED
{
  ok("4 DRAFT→REVIEW allowed", canTransitionLifecycle("DRAFT", "REVIEW"));
  const draft = makeDraftPack([
    {
      materialKey: "mat.eps_graph",
      namePl: "EPS",
      unit: "m2",
      qtyFactor: 1.05,
      factorSourceKind: "owner_approved",
      factorSourceRef: "owner://test-source-01",
      factorApprovedAt: "2026-08-10T00:00:00.000Z",
      wastePolicy: "included_in_factor",
    },
  ]);
  const review = transitionPackLifecycle(draft, "REVIEW");
  eq("4 review lifecycle", review.lifecycle, "REVIEW");
  ok("4 review cannot feed", !canPackFeedProductionBom(review));
  assert.throws(
    () => transitionPackLifecycle(review, "ACTIVE"),
    /ACTIVE/,
    "4 REVIEW→ACTIVE without APPROVED throws for trusted factors",
  );
  passed += 1;
  console.log("PASS 4 REVIEW→ACTIVE throws for trusted");
}

// 5 APPROVED requires valid source
{
  const bad = makeDraftPack([
    withLegacyFixtureProvenance({
      materialKey: "mat.eps_graph",
      namePl: "EPS",
      unit: "m2",
      qtyFactor: 1.05,
    }),
  ]);
  // legacy alone can APPROVE; trusted missing cannot
  ok("5 legacy can APPROVE", canPromoteToApproved(bad));
  const trustedOk = makeDraftPack([
    {
      materialKey: "mat.eps_graph",
      namePl: "EPS",
      unit: "m2",
      qtyFactor: 1.05,
      factorSourceKind: "owner_approved",
      factorSourceRef: "owner://norm-sheet-a",
      factorApprovedAt: "2026-08-10T12:00:00.000Z",
      wastePolicy: "included_in_factor",
    },
  ]);
  const approved = transitionPackLifecycle(
    transitionPackLifecycle(trustedOk, "REVIEW"),
    "APPROVED",
  );
  eq("5 approved lifecycle", approved.lifecycle, "APPROVED");
  ok("5 approved still not production feed", !canPackFeedProductionBom(approved));
}

// 6 ACTIVE requires approved source path
{
  const trusted = makeDraftPack([
    {
      materialKey: "mat.eps_graph",
      namePl: "EPS",
      unit: "m2",
      qtyFactor: 1.05,
      factorSourceKind: "owner_approved",
      factorSourceRef: "owner://norm-sheet-a",
      factorApprovedAt: "2026-08-10T12:00:00.000Z",
      wastePolicy: "included_in_factor",
    },
  ]);
  assert.throws(
    () => transitionPackLifecycle(trusted, "ACTIVE"),
    /ACTIVE/,
    "6 DRAFT→ACTIVE blocked for trusted (must APPROVED first)",
  );
  passed += 1;
  console.log("PASS 6 DRAFT→ACTIVE blocked for trusted");
  const active = transitionPackLifecycle(
    transitionPackLifecycle(transitionPackLifecycle(trusted, "REVIEW"), "APPROVED"),
    "ACTIVE",
  );
  eq("6 active lifecycle", active.lifecycle, "ACTIVE");
  ok("6 active can feed", canPackFeedProductionBom(active));
}

// 7 ACTIVE factor used by production BOM
{
  const etics = getPack(FIXTURE_ETICS_PACK_ID, "1.0");
  const ctx = eticsBoqContext(100);
  const plan = deriveExecutionPlan(etics, ctx);
  const bom = projectProductionBom(etics, plan, ctx);
  eq("7 bom packId", bom.packId, FIXTURE_ETICS_PACK_ID);
  eq("7 bom packVersion", bom.packVersion, "1.0");
  const eps = bom.materials.find((m) => m.materialKey === "mat.eps_graph");
  eq("7 eps qty", eps.quantity, Number((100 * 1.05).toFixed(6)));
}

// 8 version immutable
{
  const etics = getPack(FIXTURE_ETICS_PACK_ID, "1.0");
  assert.throws(
    () => attemptEditPackInPlace(etics, { namePl: "hack" }),
    /TF-8/,
    "8 in-place edit throws",
  );
  passed += 1;
  console.log("PASS 8 immutable");
}

// 9 createNextVersion
{
  const etics = getPack(FIXTURE_ETICS_PACK_ID, "1.0");
  const next = createNextVersion(etics, { namePl: "ETICS next" });
  eq("9 next version", next.packVersion, "1.1");
  eq("9 next DRAFT", next.lifecycle, "DRAFT");
  eq("9 previous still 1.0", etics.packVersion, "1.0");
  ok("9 previous name unchanged", etics.namePl !== "ETICS next");
}

// 10–11 BOM resolves packId@version · historical stable
{
  const v10 = getPack(FIXTURE_ETICS_PACK_ID, "1.0");
  const v11 = createNextVersion(v10, {
    materials: v10.materials.map((m) =>
      m.materialKey === "mat.eps_graph" ? { ...m, qtyFactor: 1.08 } : m,
    ),
  });
  registerPack(v11);
  const ctx = eticsBoqContext(50);
  const bom10 = projectBom(v10, deriveExecutionPlan(v10, ctx), ctx);
  const bom11draft = projectBom(v11, deriveExecutionPlan(v11, ctx), ctx);
  eq("10 bom10 version", bom10.packVersion, "1.0");
  eq("10 bom11 version", bom11draft.packVersion, "1.1");
  const e10 = bom10.materials.find((m) => m.materialKey === "mat.eps_graph").quantity;
  const e11 = bom11draft.materials.find((m) => m.materialKey === "mat.eps_graph").quantity;
  eq("11 historical 1.0 stable", e10, Number((50 * 1.05).toFixed(6)));
  eq("11 new draft factor", e11, Number((50 * 1.08).toFixed(6)));
  ok("11 versions diverge", e10 !== e11);
}

// 12 derivedQty = boqQty × qtyFactor
{
  const kostka = getPack(FIXTURE_KOSTKA_PACK_ID, "1.0");
  const ctx = { lines: [{ lineKey: "k", quantity: 40, unit: "m2" }] };
  const bom = projectBom(kostka, deriveExecutionPlan(kostka, ctx), ctx);
  const cubes = bom.materials.find((m) => m.materialKey === "mat.cubes_beton");
  eq("12 cubes qty", cubes.quantity, Number((40 * 1.03).toFixed(6)));
}

// 13 wastePolicy included_in_factor preserved
{
  const etics = getPack(FIXTURE_ETICS_PACK_ID, "1.0");
  ok(
    "13 all materials waste included",
    etics.materials.every((m) => m.wastePolicy === "included_in_factor"),
  );
}

// 14 missing recipe → UNBOUND
{
  const line = baseLine({
    lineId: "U1",
    description: "Montaż biurka sklepowego nietypowego",
    catalogWorkId: "cw.furniture.desk",
    quantity: 2,
    unit: "szt",
  });
  const binds = analyzeTechnologyLineBindings(baseDoc([line]));
  eq("14 unbound", binds.bindings[0].bindStatus, "unbound");
  eq("14 no bom", binds.mergedBom, null);
}

// 15–16 painting BOUND via 01B pack · factors live in painting-economy-white-v1 (not fixtures.ts)
{
  eq(
    "15 family painting",
    classifyCostItemFamily(
      baseLine({
        description: "Dwukrotne malowanie ścian farbami emulsyjnymi",
        catalogWorkId: null,
        quantity: 500,
      }),
    ),
    "painting",
  );
  const doc = baseDoc([
    baseLine({
      lineId: "P1",
      description: "Dwukrotne malowanie ścian farbami emulsyjnymi powierzchni wewnętrznych",
      catalogWorkId: null,
      quantity: 500,
      unit: "m2",
    }),
  ]);
  const exec = analyzeExecutionFromOfferBoq(doc, defaultExecutionExpertBusinessProfile());
  eq("15 painting pack", exec.selection?.packId, "pack.painting.economy_interior_white_v1");
  const paint = exec.bom?.materials.find((m) => m.materialKey === "mat.farba_lateksowa_wewnetrzna");
  eq("15 litres 83.3335", paint?.quantity, 83.3335);
  ok("16 reuses existing materialKey", paint?.materialKey === "mat.farba_lateksowa_wewnetrzna");
  ok("16 no painting pack invent norms in fixtures.ts", !/0\.083333|0\.166667/.test(fs.readFileSync("src/lib/technology-foundation/fixtures.ts", "utf8")));
}

resetTf();

// 17–24 safety static
{
  const root = process.cwd();
  const files = [
    "src/lib/technology-foundation/recipe-provenance.ts",
    "src/lib/technology-foundation/pack-lifecycle.ts",
    "src/lib/technology-foundation/project-bom.ts",
    "src/lib/technology-foundation/types.ts",
  ];
  const blob = files.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
  const codeOnly = blob.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok("17 no mat.farba in recipe-provenance", !/mat\.farba/.test(fs.readFileSync("src/lib/technology-foundation/recipe-provenance.ts", "utf8")));
  ok("18 no cw.product invent", !/cw\.product\./.test(fs.readFileSync("src/lib/technology-foundation/recipe-provenance.ts", "utf8")));
  ok("19 no PI writes", !/pushKeysToCloud|acceptManual|commitMarketQuotes/.test(codeOnly));
  ok("20 no Purchase writes", !/acceptInvoicePurchase|saveCompanyKnowledgeStoreLocal/.test(codeOnly));
  ok("21 no Market writes", !/commitMarketQuotes|publishMarketSync/.test(codeOnly));
  ok("22 no SQL", !/\bpostgres\b|\bsqlite\b|\bSQL\b/.test(codeOnly));
  ok("23 no HTTP", !/\bfetch\s*\(|axios|http\.get/.test(codeOnly));
  ok("24 no LLM/fuzzy", !/openai|embedding|fuzzyMatch|levenshtein/i.test(codeOnly));
}

// 25 ETICS regression
{
  resetTf();
  const doc = baseDoc([baseLine({ quantity: 120 })]);
  const exec = analyzeExecutionFromOfferBoq(doc, defaultExecutionExpertBusinessProfile());
  ok("25 selection etics", exec.selection?.packId === FIXTURE_ETICS_PACK_ID);
  ok("25 bom", exec.bom && exec.bom.materials.some((m) => m.materialKey === "mat.eps_graph"));
  const eps = exec.bom.materials.find((m) => m.materialKey === "mat.eps_graph");
  eq("25 eps qty", eps.quantity, Number((120 * 1.05).toFixed(6)));
}

// 26 paving regression
{
  const doc = baseDoc([
    baseLine({
      lineId: "K1",
      description: "Układanie kostki brukowej betonowej",
      catalogWorkId: "cw.paving.cubes",
      quantity: 40,
    }),
  ]);
  const exec = analyzeExecutionFromOfferBoq(doc, defaultExecutionExpertBusinessProfile());
  ok("26 selection kostka", exec.selection?.packId === FIXTURE_KOSTKA_PACK_ID);
  ok("26 bom cubes", exec.bom?.materials.some((m) => m.materialKey === "mat.cubes_beton"));
}

// 27 LINE-BINDING regression — mixed
{
  const doc = baseDoc([
    baseLine({ lineId: "E1", quantity: 100 }),
    baseLine({
      lineId: "K1",
      description: "Układanie kostki brukowej betonowej",
      catalogWorkId: "cw.paving.cubes",
      quantity: 50,
    }),
    baseLine({
      lineId: "P1",
      description: "Dwukrotne malowanie ścian farbami emulsyjnymi",
      catalogWorkId: null,
      quantity: 200,
      unit: "m2",
    }),
  ]);
  const r = analyzeTechnologyLineBindings(doc);
  eq("27 boundCount", r.boundCount, 3);
  eq("27 unboundCount", r.unboundCount, 0);
  ok("27 merged", r.mergedBom != null);
  ok(
    "27 paint litres",
    r.mergedBom.materials.some(
      (m) => m.materialKey === "mat.farba_lateksowa_wewnetrzna" && m.quantity === 33.3334,
    ),
  );
}

// DRAFT→ACTIVE grandfather for fixture_legacy still works
{
  const draftLegacy = makeDraftPack([
    withLegacyFixtureProvenance({
      materialKey: "mat.eps_graph",
      namePl: "EPS",
      unit: "m2",
      qtyFactor: 1.05,
    }),
  ]);
  const active = transitionPackLifecycle(draftLegacy, "ACTIVE");
  eq("legacy DRAFT→ACTIVE", active.lifecycle, "ACTIVE");
  ok("legacy feeds bom", canPackFeedProductionBom(active));
}

console.log(`\nALL PASS (${passed})\n`);
