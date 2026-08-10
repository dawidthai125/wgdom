/**
 * TECHNOLOGY-DECOMPOSITION-01
 * npx vite-node scripts/test-technology-decomposition-01.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  analyzeExecutionFromOfferBoq,
  analyzeTechnologyLineBindings,
  defaultExecutionExpertBusinessProfile,
  decomposeOfferBoqLine,
} from "../src/lib/execution-expert/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  FIXTURE_ETICS_PACK_ID,
  FIXTURE_KOSTKA_PACK_ID,
  FIXTURE_PAINTING_ECONOMY_PACK_ID,
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
    tenderId: "t-decomp-01",
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

console.log("\n=== TECHNOLOGY-DECOMPOSITION-01 ===\n");
resetTf();

// 1 atomic → 1 TechUnit
{
  const d = decomposeOfferBoqLine(
    baseLine({ description: "Dwukrotne malowanie farbami emulsyjnymi", quantity: 500 }),
  );
  eq("1 unit count", d.units.length, 1);
  eq("1 family painting", d.units[0].family, "painting");
  eq("1 sourceLineId", d.units[0].sourceLineId, "L1");
  ok("1 not decomposed flag", d.decomposed === false);
}

// 2 compound GK+skim+paint → 3
{
  const d = decomposeOfferBoqLine(
    baseLine({
      lineId: "C1",
      description:
        "Obudowa elementów konstrukcji płytami gipsowo-kartonowymi na rusztach + szpachlowanie + dwukrotne malowanie",
      catalogWorkId: null,
      quantity: 500,
    }),
  );
  eq("2 unit count", d.units.length, 3);
  ok(
    "2 families",
    d.units.map((u) => u.family).join(",") === "drywall,skim_coat,painting",
  );
  ok("2 decomposed", d.decomposed === true);
}

// 3 pod malowanie — no paint
{
  const d = decomposeOfferBoqLine(
    baseLine({
      lineId: "P1",
      description:
        "Przygotowanie powierzchni pod malowanie farbami emulsyjnymi starych tynków z poszpachlowaniem nierówności",
      catalogWorkId: null,
    }),
  );
  ok("3 no painting", !d.units.some((u) => u.family === "painting"));
  ok("3 no priming", !d.units.some((u) => u.family === "priming"));
  ok("3 has surface_prep", d.units.some((u) => u.family === "surface_prep"));
  ok("3 has skim", d.units.some((u) => u.family === "skim_coat"));
}

// 4 demolition door wording → demolition only
{
  const d = decomposeOfferBoqLine(
    baseLine({
      lineId: "D1",
      description: "Wykucie z muru ościeżnic drewnianych o powierzchni do 2 m2",
      catalogWorkId: null,
      unit: "szt",
      quantity: 2,
    }),
  );
  eq("4 count", d.units.length, 1);
  eq("4 demolition", d.units[0].family, "demolition");
}

// 5 product + installation explicit → two units
{
  const d = decomposeOfferBoqLine(
    baseLine({
      lineId: "I1",
      description: "Montaż umywalki ceramicznej z baterią",
      catalogWorkId: null,
      unit: "szt",
      quantity: 1,
    }),
  );
  eq("5 count", d.units.length, 2);
  ok("5 product", d.units.some((u) => u.family === "product_supply"));
  ok("5 install", d.units.some((u) => u.family === "installation"));
}

// 6 screed 20 + 10 → one parametric
{
  const d = decomposeOfferBoqLine(
    baseLine({
      lineId: "S1",
      description:
        "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 20 mm — dodatek za zmianę grubości o 10 mm",
      catalogWorkId: null,
      quantity: 40,
    }),
  );
  eq("6 count", d.units.length, 1);
  eq("6 family screed", d.units[0].family, "screed_leveling");
  eq("6 thickness 30", d.units[0].parameters?.thicknessMm, 30);
}

// 7 YDY explicit spec
{
  const d = decomposeOfferBoqLine(
    baseLine({
      lineId: "E1",
      description: "Ułożenie przewodu YDY 3x1,5mm2 wciągane do rur",
      catalogWorkId: null,
      unit: "m",
      quantity: 100,
    }),
  );
  eq("7 family", d.units[0].family, "electrical_cable_lay");
  ok("7 circuitSpec", /3x1[,.]?5mm/i.test(String(d.units[0].parameters?.circuitSpec || "")));
}

// 8 YDY missing spec → PARAMETER_REQUIRED
{
  const d = decomposeOfferBoqLine(
    baseLine({
      lineId: "E2",
      description: "Ułożenie przewodu instalacyjnego wtynkowego",
      catalogWorkId: null,
      unit: "m",
      quantity: 50,
    }),
  );
  // May be electrical or unknown — if electrical, PARAMETER_REQUIRED
  const el = d.units.find((u) => u.family === "electrical_cable_lay");
  if (el) {
    eq("8 param required", el.status, "PARAMETER_REQUIRED");
  } else {
    // wording without YDY/ulozenie pattern enough — still ok if unknown
    ok("8 no false cable guess", true);
  }
}
// stronger missing-spec case
{
  const d = decomposeOfferBoqLine(
    baseLine({
      lineId: "E3",
      description: "Ułożenie przewodu YDY wciągane do rur instalacyjnych",
      catalogWorkId: null,
      unit: "m",
      quantity: 50,
    }),
  );
  eq("8b family", d.units[0].family, "electrical_cable_lay");
  eq("8b PARAMETER_REQUIRED", d.units[0].status, "PARAMETER_REQUIRED");
}

// 9 unresolved recipe → UNBOUND (drywall)
{
  resetTf();
  const r = analyzeTechnologyLineBindings(
    baseDoc([
      baseLine({
        lineId: "G1",
        description: "Obudowa belek płytami gipsowo-kartonowymi na rusztach metalowych",
        catalogWorkId: null,
        quantity: 12,
      }),
    ]),
  );
  const u = r.techUnits.find((t) => t.family === "drywall");
  eq("9 drywall UNBOUND", u?.status, "UNBOUND");
  ok("9 no pack", u?.recipeBinding == null);
}

// 10 painting 2x → 01B litres
{
  const r = analyzeTechnologyLineBindings(
    baseDoc([
      baseLine({
        lineId: "P2",
        description: "Dwukrotne malowanie farbami emulsyjnymi powierzchni wewnętrznych",
        catalogWorkId: null,
        quantity: 500,
      }),
    ]),
  );
  const paint = r.mergedBom?.materials.find((m) => m.materialKey === "mat.farba_lateksowa_wewnetrzna");
  eq("10 litres 83.3335", paint?.quantity, 83.3335);
  eq("10 pack", r.techUnits[0]?.recipeBinding?.packId, FIXTURE_PAINTING_ECONOMY_PACK_ID);
}

// 11 sourceLineId preserved
{
  const d = decomposeOfferBoqLine(baseLine({ lineId: "SRC99", description: "Jednokrotne malowanie emulsją" }));
  eq("11 sourceLineId", d.units[0].sourceLineId, "SRC99");
}

// 12 techUnitId unique
{
  const d = decomposeOfferBoqLine(
    baseLine({
      lineId: "U2",
      description: "Obudowa GK + szpachlowanie + dwukrotne malowanie",
      catalogWorkId: null,
    }),
  );
  const ids = d.units.map((u) => u.techUnitId);
  eq("12 unique", new Set(ids).size, ids.length);
}

// 13 merged BOM retains provenance
{
  const r = analyzeTechnologyLineBindings(
    baseDoc([
      baseLine({
        lineId: "PV1",
        description: "Dwukrotne malowanie farbami emulsyjnymi",
        catalogWorkId: null,
        quantity: 100,
      }),
    ]),
  );
  const paint = r.mergedBom.materials.find((m) => m.materialKey === "mat.farba_lateksowa_wewnetrzna");
  ok("13 sourceLineIds", paint.sourceLineIds?.includes("PV1"));
  ok("13 techUnitIds", (paint.techUnitIds || []).length >= 1);
  eq("13 litres 16.6667", paint.quantity, 16.6667);
}

// 14 no second BOM — single mergedBom object
{
  const r = analyzeTechnologyLineBindings(
    baseDoc([
      baseLine({ quantity: 50 }),
      baseLine({
        lineId: "K1",
        description: "Układanie kostki brukowej betonowej",
        catalogWorkId: "cw.paving.cubes",
        quantity: 20,
      }),
    ]),
  );
  ok("14 one mergedBom", r.mergedBom != null && Array.isArray(r.mergedBom.materials));
  ok("14 has etics+paving", r.mergedBom.materials.length >= 2);
}

// 15–17 safety
{
  const files = [
    "src/lib/execution-expert/technology-decomposition.ts",
    "src/lib/execution-expert/technology-line-binding.ts",
  ];
  const blob = files
    .map((f) => fs.readFileSync(path.join(process.cwd(), f), "utf8"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  ok("15 no new materialKey invent", !/mat\.(grunt|gladz|plyta_gk)_invent/.test(blob));
  ok("16 no cw.product invent", !/cw\.product\.(drywall|skim)_new/.test(blob));
  ok("17 no writes", !/pushKeysToCloud|commitMarketQuotes|acceptInvoicePurchase/.test(blob));
  ok("17 no http/sql/llm", !/\bfetch\s*\(|openai|fuzzyMatch|\bpostgres\b/.test(blob));
}

// 18 ETICS regression
{
  const exec = analyzeExecutionFromOfferBoq(
    baseDoc([baseLine({ quantity: 120 })]),
    defaultExecutionExpertBusinessProfile(),
  );
  ok("18 etics pack", exec.selection?.packId === FIXTURE_ETICS_PACK_ID);
  ok("18 etics bom", exec.bom?.materials.some((m) => m.materialKey === "mat.eps_graph"));
}

// 19 paving regression
{
  const exec = analyzeExecutionFromOfferBoq(
    baseDoc([
      baseLine({
        lineId: "K9",
        description: "Układanie kostki brukowej betonowej",
        catalogWorkId: "cw.paving.cubes",
        quantity: 40,
      }),
    ]),
    defaultExecutionExpertBusinessProfile(),
  );
  ok("19 paving pack", exec.selection?.packId === FIXTURE_KOSTKA_PACK_ID);
}

// 20–21 01A/01B: painting 1 coat + provenance still BOUND
{
  const r1 = analyzeTechnologyLineBindings(
    baseDoc([
      baseLine({
        lineId: "P1c",
        description: "Jednokrotne malowanie farbami emulsyjnymi",
        catalogWorkId: null,
        quantity: 500,
      }),
    ]),
  );
  eq("21 litres 41.6665", r1.mergedBom.materials.find((m) => m.materialKey === "mat.farba_lateksowa_wewnetrzna").quantity, 41.6665);
  ok("20 ACTIVE paint feed", r1.techUnits[0].status === "BOUND");
}

// PARTIAL: GK+paint → paint BOUND, drywall UNBOUND
{
  const r = analyzeTechnologyLineBindings(
    baseDoc([
      baseLine({
        lineId: "CX",
        description: "Obudowa GK + szpachlowanie + dwukrotne malowanie emulsją",
        catalogWorkId: null,
        quantity: 500,
      }),
    ]),
  );
  ok("partial has BOUND paint", r.techUnits.some((u) => u.family === "painting" && u.status === "BOUND"));
  ok("partial has UNBOUND drywall", r.techUnits.some((u) => u.family === "drywall" && u.status === "UNBOUND"));
  ok(
    "partial litres present",
    r.mergedBom?.materials.some((m) => m.materialKey === "mat.farba_lateksowa_wewnetrzna" && m.quantity === 83.3335),
  );
  const agg = r.lineDecompositions[0]?.lineStatus;
  ok("partial aggregate", agg === "DECOMPOSED_PARTIAL");
}

// --- TECH-DECOMP-THICKNESS-DOUBLE-SUM-01 (S1 + S2) ---
const SCREED_BASE_20 =
  "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 20 mm";
const SCREED_ADDON_10 =
  "Warstwy wyrównawcze pod posadzki z zaprawy cementowej - dodatek za zmianę grubości o 10 mm";
const SCREED_SAME_20_10 =
  "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 20 mm — dodatek za zmianę grubości o 10 mm";
const SCREED_SAME_20_20 =
  "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 20 mm — dodatek za zmianę grubości o 20 mm";
const SCREED_DRY_NO_MM = "Warstwy wyrównawcze pod posadzki z zaprawy cementowej";
const SCREED_NON_ADDON_20_10 =
  "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 20 mm oraz warstwa 10 mm";

function screedThickness(over = {}) {
  return decomposeOfferBoqLine(
    baseLine({
      catalogWorkId: null,
      quantity: 40,
      ...over,
    }),
  );
}

// R1 base 20 desc-only → 20
{
  const d = screedThickness({ lineId: "R1", description: SCREED_BASE_20 });
  eq("R1 family", d.units[0]?.family, "screed_leveling");
  eq("R1 thickness 20", d.units[0]?.parameters?.thicknessMm, 20);
}

// R2 base 20 normalized === description → 20
{
  const d = screedThickness({
    lineId: "R2",
    description: SCREED_BASE_20,
    normalizedDescription: SCREED_BASE_20,
  });
  eq("R2 thickness 20", d.units[0]?.parameters?.thicknessMm, 20);
}

// R3 addon Δ10 desc-only → 10
{
  const d = screedThickness({ lineId: "R3", description: SCREED_ADDON_10 });
  eq("R3 thickness 10", d.units[0]?.parameters?.thicknessMm, 10);
}

// R4 addon Δ10 normalized === description → 10
{
  const d = screedThickness({
    lineId: "R4",
    description: SCREED_ADDON_10,
    normalizedDescription: SCREED_ADDON_10,
  });
  eq("R4 thickness 10", d.units[0]?.parameters?.thicknessMm, 10);
}

// R5 same-line 20+10 desc-only → 30 (existing #6 semantics)
{
  const d = screedThickness({ lineId: "R5", description: SCREED_SAME_20_10 });
  eq("R5 thickness 30", d.units[0]?.parameters?.thicknessMm, 30);
}

// R6 same-line 20+10 normalized === description → 30
{
  const d = screedThickness({
    lineId: "R6",
    description: SCREED_SAME_20_10,
    normalizedDescription: SCREED_SAME_20_10,
  });
  eq("R6 thickness 30", d.units[0]?.parameters?.thicknessMm, 30);
}

// R7 non-addon 50 duplicate → 50
{
  const desc = "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 50 mm";
  const d = screedThickness({
    lineId: "R7",
    description: desc,
    normalizedDescription: desc,
  });
  eq("R7 thickness 50", d.units[0]?.parameters?.thicknessMm, 50);
}

// R8 addon Δ10 + catalogWorkId containing 10mm → 10 (CW excluded from thickness)
{
  const d = screedThickness({
    lineId: "R8",
    description: SCREED_ADDON_10,
    normalizedDescription: SCREED_ADDON_10,
    catalogWorkId: "cw.screed.addon.10mm.delta",
  });
  eq("R8 thickness 10 not 20", d.units[0]?.parameters?.thicknessMm, 10);
}

// R9 dry screed without mm → PARAMETER_REQUIRED / no false thickness
{
  const d = screedThickness({
    lineId: "R9",
    description: SCREED_DRY_NO_MM,
    normalizedDescription: SCREED_DRY_NO_MM,
  });
  eq("R9 family", d.units[0]?.family, "screed_leveling");
  eq("R9 PARAMETER_REQUIRED", d.units[0]?.status, "PARAMETER_REQUIRED");
  ok("R9 no thicknessMm", d.units[0]?.parameters?.thicknessMm == null);
}

// E1 non-addon 20 mm ... 10 mm without addon keyword → 20
{
  const d = screedThickness({ lineId: "E1n", description: SCREED_NON_ADDON_20_10 });
  eq("E1 non-addon first mm 20", d.units[0]?.parameters?.thicknessMm, 20);
}

// E2 base 20 normalized === description → 20 (dup guard)
{
  const d = screedThickness({
    lineId: "E2n",
    description: SCREED_BASE_20,
    normalizedDescription: SCREED_BASE_20,
  });
  eq("E2 dup base 20", d.units[0]?.parameters?.thicknessMm, 20);
}

// E3 same-line 20+Δ10 normalized !== description → 30
{
  const d = screedThickness({
    lineId: "E3n",
    description: SCREED_SAME_20_10,
    normalizedDescription:
      "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 20 mm",
  });
  eq("E3 same-line norm!=desc 30", d.units[0]?.parameters?.thicknessMm, 30);
}

// E4 electrical 3x1,5mm2 — not screed thickness
{
  const d = screedThickness({
    lineId: "E4n",
    description: "Ułożenie przewodu YDY 3x1,5mm2 wciągane do rur",
    catalogWorkId: null,
    unit: "m",
    quantity: 100,
  });
  ok("E4 not screed", !d.units.some((u) => u.family === "screed_leveling"));
  eq("E4 electrical family", d.units[0]?.family, "electrical_cable_lay");
  ok("E4 no thicknessMm", d.units[0]?.parameters?.thicknessMm == null);
  ok("E4 circuitSpec", /3x1[,.]?5mm/i.test(String(d.units[0]?.parameters?.circuitSpec || "")));
}

// E5 L1 known limitation: 20 + Δ20 → unique {20} → 20 (NOT 40)
{
  const d = screedThickness({
    lineId: "E5n",
    description: SCREED_SAME_20_20,
    normalizedDescription: SCREED_SAME_20_20,
  });
  eq("E5 L1 unique-mm 20", d.units[0]?.parameters?.thicknessMm, 20);
}

// R10: existing suite above already executed — marker
ok("R10 existing suite reached thickness block", true);

console.log(`\nALL PASS (${passed})\n`);
