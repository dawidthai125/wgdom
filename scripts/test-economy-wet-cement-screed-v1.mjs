/**
 * ECONOMY_WET_CEMENT_SCREED_V1 — Owner GO IMPLEMENT tests
 * npx vite-node scripts/test-economy-wet-cement-screed-v1.mjs
 */
import assert from "node:assert/strict";
import {
  analyzeTechnologyLineBindings,
  decomposeOfferBoqLine,
  resolveWetCementScreedEconomyV1Eligibility,
} from "../src/lib/execution-expert/index.ts";
import {
  lookupMaterialKeyByCatalogWorkId,
  mapMaterialToMarketWork,
} from "../src/lib/pricing-expert/material-market-map.ts";
import {
  canPackFeedProductionBom,
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  FIXTURE_SCREED_ECONOMY_WET_CEMENT_PACK_ID,
  SCREED_ECONOMY_WET_CEMENT_MATERIAL_KEY,
  SCREED_ECONOMY_WET_CEMENT_QTY_FACTOR,
  SCREED_ECONOMY_WET_CEMENT_V1_SOURCE_REF,
  getPack,
  seedB0Fixtures,
  seedScreedEconomyWetCementV1,
  validateRecipeProvenance,
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
    quantity: 40,
    unit: "m2",
    description: "",
    normalizedDescription: "",
    catalogWorkId: null,
    ...over,
  };
}

function baseDoc(lines) {
  return {
    schemaVersion: 5,
    tenderId: "t-screed-v1",
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

const WET_20 =
  "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 20 mm";
const WET_50 = "Jastrych cementowy grubości 50 mm";
const WET_100 =
  "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 100 mm";
const ADDON_10 =
  "Warstwy wyrównawcze pod posadzki z zaprawy cementowej - dodatek za zmianę grubości o 10 mm";
const SAME_20_10 =
  "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 20 mm — dodatek za zmianę grubości o 10 mm";

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  PASS ${name}`);
}

function bomKg(r) {
  return r.mergedBom?.materials.find((m) => m.materialKey === SCREED_ECONOMY_WET_CEMENT_MATERIAL_KEY)
    ?.quantity;
}

console.log("ECONOMY_WET_CEMENT_SCREED_V1");
resetTf();

// Pack / provenance
{
  const pack = getPack(FIXTURE_SCREED_ECONOMY_WET_CEMENT_PACK_ID, "1.0");
  assert.ok(pack);
  assert.equal(pack.lifecycle, "ACTIVE");
  assert.equal(pack.materials[0].qtyFactor, SCREED_ECONOMY_WET_CEMENT_QTY_FACTOR);
  assert.equal(pack.materials[0].wastePolicy, "included_in_factor");
  assert.equal(pack.materials[0].factorSourceRef, SCREED_ECONOMY_WET_CEMENT_V1_SOURCE_REF);
  assert.equal(canPackFeedProductionBom(pack), true);
  const prov = validateRecipeProvenance(pack);
  assert.equal(prov.blockingIssues.length, 0);
  ok("pack ACTIVE + provenance 01A + factor 2.0");
}

// Market map pairing
{
  const mapped = mapMaterialToMarketWork(SCREED_ECONOMY_WET_CEMENT_MATERIAL_KEY);
  assert.equal(mapped?.workId, "cw.product.jastrych_cementowy");
  assert.equal(lookupMaterialKeyByCatalogWorkId("cw.product.jastrych_cementowy"), SCREED_ECONOMY_WET_CEMENT_MATERIAL_KEY);
  ok("material-market-map mat ↔ cw.product.jastrych_cementowy");
}

// T1 20 mm → A×20×2.0
{
  const r = analyzeTechnologyLineBindings(baseDoc([line({ description: WET_20, quantity: 40 })]));
  const u = r.techUnits.find((t) => t.family === "screed_leveling");
  assert.equal(u?.status, "BOUND");
  assert.equal(u?.parameters?.thicknessMm, 20);
  assert.equal(bomKg(r), 40 * 20 * 2);
  ok("T1 20 mm → 1600 kg");
}

// T2 50 mm
{
  const r = analyzeTechnologyLineBindings(baseDoc([line({ description: WET_50, quantity: 10 })]));
  assert.equal(bomKg(r), 10 * 50 * 2);
  ok("T2 50 mm → 1000 kg");
}

// T3 100 mm
{
  const r = analyzeTechnologyLineBindings(baseDoc([line({ description: WET_100, quantity: 5 })]));
  assert.equal(bomKg(r), 5 * 100 * 2);
  ok("T3 100 mm → 1000 kg");
}

// T4 Addon Δ10
{
  const r = analyzeTechnologyLineBindings(baseDoc([line({ description: ADDON_10, quantity: 40 })]));
  const u = r.techUnits.find((t) => t.family === "screed_leveling");
  assert.equal(u?.parameters?.thicknessMm, 10);
  assert.equal(bomKg(r), 40 * 10 * 2);
  ok("T4 addon Δ10 → 800 kg");
}

// T5 Base 20 + addon Δ10 → A×30×2.0
{
  const r = analyzeTechnologyLineBindings(
    baseDoc([
      line({ lineId: "B20", description: WET_20, quantity: 40 }),
      line({ lineId: "A10", description: ADDON_10, quantity: 40 }),
    ]),
  );
  assert.equal(bomKg(r), 40 * 30 * 2);
  ok("T5 base+addon merge → 2400 kg (= A×30×2)");
}

// T6 Dry screed MUST NOT bind
{
  const d =
    "Warstwa z suchego jastrychu grubości 20 mm na podsypce";
  const r = analyzeTechnologyLineBindings(baseDoc([line({ description: d })]));
  const u = r.techUnits.find((t) => t.family === "screed_leveling");
  assert.ok(!u || u.status !== "BOUND");
  assert.equal(bomKg(r), undefined);
  ok("T6 dry screed unbound");
}

// T7 Dry board
{
  const d = "Płyta suchego jastrychu 20 mm";
  const elig = resolveWetCementScreedEconomyV1Eligibility(line({ description: d }), 20);
  assert.equal(elig, "unbound");
  const r = analyzeTechnologyLineBindings(baseDoc([line({ description: d })]));
  assert.equal(bomKg(r), undefined);
  ok("T7 dry board unbound");
}

// T8 Leveling compound
{
  const d = "Masa samopoziomująca grubości 20 mm";
  assert.equal(resolveWetCementScreedEconomyV1Eligibility(line({ description: d }), 20), "unbound");
  ok("T8 leveling compound unbound");
}

// T9 Anhydrite / gypsum
{
  assert.equal(
    resolveWetCementScreedEconomyV1Eligibility(line({ description: "Jastrych anhydrytowy 40 mm" }), 40),
    "unbound",
  );
  assert.equal(
    resolveWetCementScreedEconomyV1Eligibility(line({ description: "Jastrych gipsowy 40 mm" }), 40),
    "unbound",
  );
  ok("T9 anhydrite/gypsum unbound");
}

// T10 Missing thickness → PARAMETER_REQUIRED
{
  const d = "Warstwy wyrównawcze pod posadzki z zaprawy cementowej";
  const decomp = decomposeOfferBoqLine(line({ description: d }));
  assert.equal(decomp.units[0]?.status, "PARAMETER_REQUIRED");
  const r = analyzeTechnologyLineBindings(baseDoc([line({ description: d })]));
  const u = r.techUnits.find((t) => t.family === "screed_leveling");
  assert.equal(u?.status, "PARAMETER_REQUIRED");
  assert.equal(bomKg(r), undefined);
  ok("T10 missing thickness PARAMETER_REQUIRED");
}

// T11 Ambiguous wet wording → MUST NOT bind silently
{
  const d = "Warstwa wyrównująca pod posadzki 20 mm";
  assert.equal(resolveWetCementScreedEconomyV1Eligibility(line({ description: d }), 20), "unbound");
  ok("T11 ambiguous leveling unbound");
}

// T12 Out-of-range — no clamp
{
  assert.equal(
    resolveWetCementScreedEconomyV1Eligibility(line({ description: WET_20.replace("20", "9") }), 9),
    "unbound",
  );
  assert.equal(
    resolveWetCementScreedEconomyV1Eligibility(line({ description: WET_20.replace("20", "101") }), 101),
    "unbound",
  );
  const r = analyzeTechnologyLineBindings(
    baseDoc([line({ description: "Warstwy wyrównawcze pod posadzki z zaprawy cementowej grubości 101 mm" })]),
  );
  const u = r.techUnits.find((t) => t.family === "screed_leveling");
  assert.ok(u?.status !== "BOUND");
  assert.equal(bomKg(r), undefined);
  ok("T12 out-of-range no clamp / no bind");
}

// T13 Wet cement explicit — eligibility eligible
{
  assert.equal(
    resolveWetCementScreedEconomyV1Eligibility(line({ description: WET_20 }), 20),
    "eligible",
  );
  ok("T13 wet cement explicit eligible");
}

// T14 family alone / dry cue sharing family path — MUST NOT bind
{
  // Eligibility without wet cement cue
  assert.equal(
    resolveWetCementScreedEconomyV1Eligibility(
      line({ description: "Warstwa wyrównawcza podkładu 20 mm" }),
      20,
    ),
    "unbound",
  );
  ok("T14 family/token alone not eligible");
}

// Defect-aware: d17d76a1 Δ10 with normalized === description → 10
{
  const r = analyzeTechnologyLineBindings(
    baseDoc([
      line({
        lineId: "DUP10",
        description: ADDON_10,
        normalizedDescription: ADDON_10,
        quantity: 40,
      }),
    ]),
  );
  const u = r.techUnits.find((t) => t.family === "screed_leveling");
  assert.equal(u?.parameters?.thicknessMm, 10);
  assert.equal(bomKg(r), 40 * 10 * 2);
  ok("DEFECT-AWARE Δ10 dup fields → thicknessMm=10");
}

// Defect-aware: same-line 20+10 → 30; base+addon merge 30
{
  const same = analyzeTechnologyLineBindings(
    baseDoc([
      line({
        lineId: "SAME",
        description: SAME_20_10,
        normalizedDescription: SAME_20_10,
        quantity: 40,
      }),
    ]),
  );
  assert.equal(same.techUnits[0]?.parameters?.thicknessMm, 30);
  assert.equal(bomKg(same), 40 * 30 * 2);

  const merged = analyzeTechnologyLineBindings(
    baseDoc([
      line({
        lineId: "B",
        description: WET_20,
        normalizedDescription: WET_20,
        quantity: 40,
      }),
      line({
        lineId: "A",
        description: ADDON_10,
        normalizedDescription: ADDON_10,
        quantity: 40,
      }),
    ]),
  );
  assert.equal(bomKg(merged), 40 * 30 * 2);
  ok("DEFECT-AWARE 20+Δ10 → 30 (same-line + merge)");
}

console.log(`\nALL PASS (${passed})\n`);
