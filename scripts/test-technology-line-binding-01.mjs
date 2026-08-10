/**
 * TECHNOLOGY-LINE-BINDING-01 — unit tests
 * npx vite-node scripts/test-technology-line-binding-01.mjs
 */
import assert from "node:assert/strict";
import {
  analyzeExecutionFromOfferBoq,
  analyzeTechnologyLineBindings,
  buildTechnologyLineBindings,
  classifyCostItemFamily,
  defaultExecutionExpertBusinessProfile,
  projectAndMergeBomFromBindings,
} from "../src/lib/execution-expert/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  FIXTURE_ETICS_PACK_ID,
  FIXTURE_KOSTKA_PACK_ID,
  getPack,
  projectBom,
  deriveExecutionPlan,
  seedB0Fixtures,
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
    tenderId: "t-tlb-01",
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

console.log("\n=== TECHNOLOGY-LINE-BINDING-01 ===\n");
resetTf();

// 1 ETICS line → correct pack binding
{
  const line = baseLine();
  eq("1 family etics", classifyCostItemFamily(line), "etics_envelope");
  const binds = buildTechnologyLineBindings(baseDoc([line]));
  eq("1 bind count", binds.length, 1);
  eq("1 bound", binds[0].bindStatus, "bound");
  eq("1 pack", binds[0].packId, FIXTURE_ETICS_PACK_ID);
}

// 2 Paving line → correct pack binding
{
  const line = baseLine({
    lineId: "K1",
    description: "Układanie kostki brukowej betonowej",
    catalogWorkId: "cw.paving.cubes",
    quantity: 40,
  });
  eq("2 family paving", classifyCostItemFamily(line), "paving_cubes");
  const binds = buildTechnologyLineBindings(baseDoc([line]));
  eq("2 bound", binds[0].bindStatus, "bound");
  eq("2 pack", binds[0].packId, FIXTURE_KOSTKA_PACK_ID);
}

// 3 Painting → family painting · UNBOUND · NO material derivation
{
  const line = baseLine({
    lineId: "P1",
    description: "Dwukrotne malowanie ścian farbami emulsyjnymi powierzchni wewnętrznych",
    catalogWorkId: null,
    quantity: 500,
    unit: "m2",
  });
  eq("3 family painting", classifyCostItemFamily(line), "painting");
  const doc = baseDoc([line]);
  const result = analyzeTechnologyLineBindings(doc);
  eq("3 unbound status", result.bindings[0].bindStatus, "unbound");
  eq("3 no pack", result.bindings[0].packId, null);
  eq("3 no merged bom", result.mergedBom, null);
  eq("3 boundCount 0", result.boundCount, 0);
  const exec = analyzeExecutionFromOfferBoq(doc, defaultExecutionExpertBusinessProfile());
  eq("3 exec bom null", exec.bom, null);
  eq("3 exec selection null", exec.selection, null);
  ok("3 no paint material invented", !(exec.bom?.materials || []).some((m) => /farba|paint/i.test(m.materialKey)));
}

// 4 Unknown → UNBOUND
{
  const line = baseLine({
    lineId: "U1",
    description: "Montaż biurka sklepowego nietypowego",
    catalogWorkId: "cw.furniture.desk",
    quantity: 2,
    unit: "szt",
  });
  eq("4 family unknown", classifyCostItemFamily(line), "unknown");
  const binds = buildTechnologyLineBindings(baseDoc([line]));
  eq("4 unbound", binds[0].bindStatus, "unbound");
}

// 5 Mixed tender: ETICS + paving + unbound → merged BOM
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
  const result = analyzeTechnologyLineBindings(doc);
  eq("5 boundCount", result.boundCount, 2);
  eq("5 unboundCount", result.unboundCount, 1);
  ok("5 merged bom", result.mergedBom != null);
  const mats = result.mergedBom.materials.map((m) => m.materialKey);
  ok("5 has etics mat", mats.includes("mat.eps_graph"));
  ok("5 has paving mat", mats.includes("mat.cubes_beton"));
  ok("5 no paint mat", !mats.some((k) => /farba|paint/i.test(k)));
  const exec = analyzeExecutionFromOfferBoq(doc, defaultExecutionExpertBusinessProfile());
  ok("5 exec bom", exec.bom && exec.bom.materials.length >= 2);
  ok("5 lineBindings", (exec.lineBindings || []).length === 3);
}

// 6 Multiple lines same pack → quantities sum
{
  const doc = baseDoc([
    baseLine({ lineId: "E1", quantity: 100 }),
    baseLine({ lineId: "E2", quantity: 50, description: "Klejenie płyt EPS grafit ETICS" }),
  ]);
  const result = analyzeTechnologyLineBindings(doc);
  eq("6 both bound", result.boundCount, 2);
  const pack = getPack(FIXTURE_ETICS_PACK_ID, "1.0");
  ok("6 pack loaded", !!pack);
  const eps = pack.materials.find((m) => m.materialKey === "mat.eps_graph");
  const expected = Number(((100 + 50) * eps.qtyFactor).toFixed(6));
  const got = result.mergedBom.materials.find((m) => m.materialKey === "mat.eps_graph");
  eq("6 eps qty sum", got.quantity, expected);

  // Equivalent to single ctx with both lines via classic projectBom
  const plan = deriveExecutionPlan(pack, {
    lines: [
      { lineKey: "E1", quantity: 100, unit: "m2", catalogWorkIdHint: "cw.etics.boards" },
      { lineKey: "E2", quantity: 50, unit: "m2", catalogWorkIdHint: "cw.etics.boards" },
    ],
  });
  const classic = projectBom(pack, plan, {
    lines: [
      { lineKey: "E1", quantity: 100, unit: "m2" },
      { lineKey: "E2", quantity: 50, unit: "m2" },
    ],
  });
  const classicEps = classic.materials.find((m) => m.materialKey === "mat.eps_graph");
  eq("6 matches classic sum projectBom", got.quantity, classicEps.quantity);
}

// 7 ETICS regression — single line analyze still produces BOM
{
  const doc = baseDoc([baseLine({ quantity: 120 })]);
  const exec = analyzeExecutionFromOfferBoq(doc, defaultExecutionExpertBusinessProfile());
  ok("7 selection etics", exec.selection && exec.selection.packId === FIXTURE_ETICS_PACK_ID);
  ok("7 bom materials", exec.bom && exec.bom.materials.length >= 1);
  const pack = getPack(FIXTURE_ETICS_PACK_ID, "1.0");
  const epsFactor = pack.materials.find((m) => m.materialKey === "mat.eps_graph").qtyFactor;
  const eps = exec.bom.materials.find((m) => m.materialKey === "mat.eps_graph");
  eq("7 eps qty", eps.quantity, Number((120 * epsFactor).toFixed(6)));
  ok("7 decision", exec.technologyDecision === "allow" || exec.technologyDecision === "degrade");
}

// 8 Paving regression
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
  ok("8 selection kostka", exec.selection && exec.selection.packId === FIXTURE_KOSTKA_PACK_ID);
  ok("8 bom", exec.bom && exec.bom.materials.some((m) => m.materialKey === "mat.cubes_beton"));
}

// 9 No arbitrary consumption values introduced in classifier/binding modules
{
  const fs = await import("node:fs");
  const path = await import("node:path");
  const root = process.cwd();
  const files = [
    "src/lib/execution-expert/cost-item-family.ts",
    "src/lib/execution-expert/technology-line-binding.ts",
    "src/lib/execution-expert/analyze.ts",
  ];
  for (const f of files) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    ok(
      `9 no l/m2 invent in ${f}`,
      !/0\.25\s*l|l\/m2|kg\/m2|3\s*[x×]\s*1\.5|3\s*[x×]\s*2\.5/i.test(src),
    );
  }
}

// 10–11 No new materialKey / CatalogWork in slice files
{
  const fs = await import("node:fs");
  const binding = fs.readFileSync("src/lib/execution-expert/technology-line-binding.ts", "utf8");
  const family = fs.readFileSync("src/lib/execution-expert/cost-item-family.ts", "utf8");
  ok("10 no mat.farba invent", !/mat\.farba|mat\.paint/.test(binding + family));
  ok("11 no cw.product invent", !/cw\.product\./.test(binding + family));
}

// 12–14 No PI / Quotes / Purchase writes in slice
{
  const fs = await import("node:fs");
  const analyze = fs.readFileSync("src/lib/execution-expert/analyze.ts", "utf8");
  const binding = fs.readFileSync("src/lib/execution-expert/technology-line-binding.ts", "utf8");
  const blob = analyze + binding;
  ok("12 no pushKeysToCloud", !/pushKeysToCloud/.test(blob));
  ok("13 no acceptManual|commitMarket", !/acceptManual|commitMarketQuotes|saveCompanyKnowledge/.test(blob));
  ok("14 no purchase write", !/acceptInvoicePurchase|saveCompanyKnowledgeStoreLocal/.test(blob));
}

// 15–16 No SQL / external HTTP in slice
{
  const fs = await import("node:fs");
  const binding = fs.readFileSync("src/lib/execution-expert/technology-line-binding.ts", "utf8");
  ok("15 no sql", !/\bSQL\b|postgres|sqlite/i.test(binding));
  ok("16 no fetch http", !/\bfetch\s*\(|axios|http\.get/.test(binding));
}

// 17 No fuzzy / LLM (ignore ban wording in comments)
{
  const fs = await import("node:fs");
  const family = fs
    .readFileSync("src/lib/execution-expert/cost-item-family.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  ok("17 no llm/fuzzy", !/openai|embedding|fuzzyMatch|levenshtein|cosineSimilarity/i.test(family));
}

// 18 Bid unchanged — binding does not import bid calculator
{
  const fs = await import("node:fs");
  const analyze = fs.readFileSync("src/lib/execution-expert/analyze.ts", "utf8");
  const binding = fs.readFileSync("src/lib/execution-expert/technology-line-binding.ts", "utf8");
  ok(
    "18 no bid calculator import",
    !/tenders-bid-calculator|tender-offer-boq-bid-adapter|bid-time-load-guard/.test(
      analyze + binding,
    ),
  );
}

// Deny path still works (ETICS + empty capabilities)
{
  const denied = analyzeExecutionFromOfferBoq(baseDoc([baseLine()]), {
    companyCapabilityIds: [],
    availableEquipmentKeys: [],
  });
  eq("deny decision", denied.technologyDecision, "deny");
}

console.log(`\nALL PASS (${passed})\n`);
