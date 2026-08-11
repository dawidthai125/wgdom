/**
 * PAINTING-SCOPE-HARDEN-01 — economy white eligibility harden
 * npx vite-node scripts/test-painting-scope-harden-01.mjs
 */
import assert from "node:assert/strict";
import {
  analyzeTechnologyLineBindings,
  decomposeOfferBoqLine,
  resolvePaintingEconomyV1Eligibility,
  resolvePrimingEconomyV1Eligibility,
  resolveWetCementScreedEconomyV1Eligibility,
  normalizeElectricalCircuitSpec,
  materialKeyForNormalizedCircuitSpec,
} from "../src/lib/execution-expert/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  FIXTURE_PAINTING_ECONOMY_PACK_ID,
  PAINTING_ECONOMY_FACTOR_2_COATS,
  seedB0Fixtures,
  seedScreedEconomyWetCementV1,
} from "../src/lib/technology-foundation/index.ts";

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
  seedScreedEconomyWetCementV1();
}

function line(over = {}) {
  return {
    lineId: "L1",
    lp: "1",
    description: "",
    normalizedDescription: "",
    quantity: 1,
    quantityRaw: "1",
    unit: "m2",
    catalogWorkId: null,
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
    tenderId: "t-painting-harden-01",
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

function bind(over) {
  resetTf();
  return analyzeTechnologyLineBindings(baseDoc([line(over)]));
}

function latexLitres(result) {
  const m = result.mergedBom?.materials?.find(
    (x) => x.materialKey === "mat.farba_lateksowa_wewnetrzna",
  );
  return m ? m.quantity : 0;
}

function paintingBound(result) {
  return result.bindings.some(
    (b) =>
      b.bindStatus === "bound" &&
      b.packId === FIXTURE_PAINTING_ECONOMY_PACK_ID &&
      (b.costItemFamily === "painting" || b.techUnitStatus === "BOUND"),
  );
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

console.log("\n=== PAINTING-SCOPE-HARDEN-01 ===\n");

// --- T1 ZZK emulsja 121.35 m² × 2 ---
{
  const desc = "Dwukrotne malowanie farbami emulsyjnymi powierzchni wewnętrznych";
  eq("T1 elig", resolvePaintingEconomyV1Eligibility(line({ description: desc, quantity: 121.35, unit: "m2" })), "eligible");
  const r = bind({ description: desc, quantity: 121.35, unit: "m2" });
  ok("T1 BOUND", paintingBound(r));
  const lit = latexLitres(r);
  eq("T1 litres", lit, Number((121.35 * PAINTING_ECONOMY_FACTOR_2_COATS).toFixed(6)));
  ok("T1 lateks key", lit > 0);
}

// --- T2 ZZK emulsja 38.2 m² × 2 ---
{
  const desc = "Dwukrotne malowanie farbami emulsyjnymi powierzchni wewnętrznych";
  eq("T2 elig", resolvePaintingEconomyV1Eligibility(line({ description: desc, quantity: 38.2, unit: "m2" })), "eligible");
  const r = bind({ description: desc, quantity: 38.2, unit: "m2" });
  ok("T2 BOUND", paintingBound(r));
  eq("T2 litres", latexLitres(r), Number((38.2 * PAINTING_ECONOMY_FACTOR_2_COATS).toFixed(6)));
}

// --- T3 ZZK olejna rury 12.42 m ---
{
  const desc =
    "Dwukrotne malowanie farbą olejną rur wodociągowych i gazowych o średnicy do 50 mm";
  eq("T3 elig", resolvePaintingEconomyV1Eligibility(line({ description: desc, quantity: 12.42, unit: "m" })), "unbound");
  const r = bind({ description: desc, quantity: 12.42, unit: "m" });
  ok("T3 not BOUND", !paintingBound(r));
  eq("T3 zero lateks", latexLitres(r), 0);
  eq("T3 status UNBOUND", r.bindings[0]?.techUnitStatus, "UNBOUND");
}

// --- T4 ZZK wapienna ściany ---
{
  const desc = "Dwukrotne malowanie farbami wapiennymi starych tynków wewnętrznych ścian";
  eq("T4 elig", resolvePaintingEconomyV1Eligibility(line({ description: desc, quantity: 22.08, unit: "m2" })), "unbound");
  const r = bind({ description: desc, quantity: 22.08, unit: "m2" });
  ok("T4 not BOUND", !paintingBound(r));
  eq("T4 zero lateks", latexLitres(r), 0);
}

// --- T5 ZZK wapienna sufity ---
{
  const desc = "Dwukrotne malowanie farbami wapiennymi starych tynków wewnętrznych sufitów";
  eq("T5 elig", resolvePaintingEconomyV1Eligibility(line({ description: desc, quantity: 5.12, unit: "m2" })), "unbound");
  const r = bind({ description: desc, quantity: 5.12, unit: "m2" });
  ok("T5 not BOUND", !paintingBound(r));
  eq("T5 zero lateks", latexLitres(r), 0);
}

// --- T6 ZZK ościeżnice 3 szt. ---
{
  const desc =
    "Ościeżnice drzwiowe stalowe lub drewniane dwukrotnie malowane na budowie FD1 dla drzwi wewnątrzlokalowych wbudowane w trakcie wznoszenia ścian";
  eq("T6 elig", resolvePaintingEconomyV1Eligibility(line({ description: desc, quantity: 3, unit: "szt." })), "unbound");
  const r = bind({ description: desc, quantity: 3, unit: "szt." });
  ok("T6 not BOUND", !paintingBound(r));
  eq("T6 zero lateks", latexLitres(r), 0);
  eq("T6 UNBOUND not PARAMETER_REQUIRED", r.bindings[0]?.techUnitStatus, "UNBOUND");
}

// --- T7 emulsja + m / mb ---
{
  const desc = "Dwukrotne malowanie farbami emulsyjnymi powierzchni wewnętrznych";
  eq("T7 m unbound", resolvePaintingEconomyV1Eligibility(line({ description: desc, unit: "m" })), "unbound");
  eq("T7 mb unbound", resolvePaintingEconomyV1Eligibility(line({ description: desc, unit: "mb" })), "unbound");
  ok("T7 bind m not BOUND", !paintingBound(bind({ description: desc, quantity: 10, unit: "m" })));
}

// --- T8 emulsja + szt ---
{
  const desc = "Dwukrotne malowanie farbami emulsyjnymi powierzchni wewnętrznych";
  eq("T8 szt unbound", resolvePaintingEconomyV1Eligibility(line({ description: desc, unit: "szt" })), "unbound");
  ok("T8 bind not BOUND", !paintingBound(bind({ description: desc, quantity: 2, unit: "szt." })));
}

// --- T9 coats 1 ---
{
  const desc = "Jednokrotne malowanie ścian farbami emulsyjnymi";
  eq("T9 elig", resolvePaintingEconomyV1Eligibility(line({ description: desc, unit: "m2" })), "eligible");
  const r = bind({ description: desc, quantity: 100, unit: "m2" });
  ok("T9 BOUND", paintingBound(r));
  eq("T9 coats", r.bindings[0]?.coats, 1);
}

// --- T10 coats 2 ---
{
  const desc = "Dwukrotne malowanie ścian farbami emulsyjnymi";
  eq("T10 elig", resolvePaintingEconomyV1Eligibility(line({ description: desc, unit: "m2" })), "eligible");
  const r = bind({ description: desc, quantity: 100, unit: "m2" });
  ok("T10 BOUND", paintingBound(r));
  eq("T10 coats", r.bindings[0]?.coats, 2);
}

// --- T11 bare malowanie farbą ---
{
  const desc = "Malowanie tynków wewnętrznych gładkich farbą";
  eq("T11 elig", resolvePaintingEconomyV1Eligibility(line({ description: desc, unit: "m2" })), "unbound");
  ok("T11 not BOUND", !paintingBound(bind({ description: desc, quantity: 154.5, unit: "m2" })));
}

// --- T12 prep pod malowanie — no painting BOUND ---
{
  const desc =
    "Przygotowanie powierzchni pod malowanie farbami emulsyjnymi starych tynków z poszpachlowaniem nierówności";
  const deco = decomposeOfferBoqLine(line({ description: desc, quantity: 50, unit: "m2" }));
  ok(
    "T12 no painting TechUnit",
    !deco.units.some((u) => u.family === "painting"),
  );
  const r = bind({ description: desc, quantity: 50, unit: "m2" });
  ok("T12 no painting BOUND", !paintingBound(r));
}

// --- T13 drzwi / stolarka ---
{
  const d1 = "Dwukrotne malowanie drzwi wewnętrznych farbami emulsyjnymi";
  const d2 = "Malowanie stolarki okiennej farbami lateksowymi dwukrotnie";
  eq("T13 drzwi", resolvePaintingEconomyV1Eligibility(line({ description: d1, unit: "m2" })), "unbound");
  eq("T13 stolarka", resolvePaintingEconomyV1Eligibility(line({ description: d2, unit: "m2" })), "unbound");
  ok("T13 drzwi not BOUND", !paintingBound(bind({ description: d1, quantity: 5, unit: "m2" })));
}

// --- T14 regression economy paint / decomp ---
{
  const r = bind({
    description: "Dwukrotne malowanie farbami emulsyjnymi",
    quantity: 100,
    unit: "m2",
  });
  ok("T14 01B-style BOUND", paintingBound(r));
  eq("T14 litres", latexLitres(r), Number((100 * PAINTING_ECONOMY_FACTOR_2_COATS).toFixed(6)));

  const deco = decomposeOfferBoqLine(
    line({
      description: "Obudowa GK + szpachlowanie + dwukrotne malowanie emulsją",
      quantity: 10,
      unit: "m2",
    }),
  );
  ok(
    "T14 decomp has painting",
    deco.units.some((u) => u.family === "painting"),
  );
}

// --- T15 smoke SCREED / priming / electrical untouched ---
{
  eq(
    "T15 priming still eligible",
    resolvePrimingEconomyV1Eligibility(
      line({ description: "Gruntowanie podłoży preparatami - powierzchnie pionowe", unit: "m2" }),
    ),
    "eligible",
  );
  const prim = bind({
    description: "Gruntowanie podłoży preparatami - powierzchnie pionowe",
    quantity: 100,
    unit: "m2",
  });
  ok(
    "T15 priming BOUND",
    prim.bindings.some((b) => b.bindStatus === "bound" && b.costItemFamily === "priming"),
  );

  const wet =
    "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 20 mm";
  eq(
    "T15 screed eligible",
    resolveWetCementScreedEconomyV1Eligibility(line({ description: wet, unit: "m2" }), 20),
    "eligible",
  );
  const screed = bind({ description: wet, quantity: 40, unit: "m2" });
  ok(
    "T15 screed BOUND",
    screed.bindings.some(
      (b) => b.bindStatus === "bound" && b.costItemFamily === "screed_leveling",
    ),
  );

  const n = normalizeElectricalCircuitSpec("YDY 3x1,5");
  eq("T15 electrical normalize", n, "YDY 3x1.5");
  ok(
    "T15 electrical key",
    !!materialKeyForNormalizedCircuitSpec(n),
  );
}

// OUT before coats → never PARAMETER_REQUIRED for oil without coats
{
  const desc = "Malowanie farbą olejną rur";
  eq(
    "OUT oil no-coats → unbound not param",
    resolvePaintingEconomyV1Eligibility(line({ description: desc, unit: "m2" })),
    "unbound",
  );
}

// emulsja + m2 + no coats → parameter_required
{
  eq(
    "param coats",
    resolvePaintingEconomyV1Eligibility(
      line({
        description: "Malowanie ścian farbami emulsyjnymi",
        unit: "m2",
      }),
    ),
    "parameter_required",
  );
}

console.log(`\nOK ${passed} assertions — PAINTING-SCOPE-HARDEN-01\n`);
