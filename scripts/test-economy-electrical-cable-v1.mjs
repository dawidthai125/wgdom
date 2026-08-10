/**
 * ECONOMY-ELECTRICAL-CABLE-V1 — Owner GO IMPLEMENT tests
 * npx vite-node scripts/test-economy-electrical-cable-v1.mjs
 */
import assert from "node:assert/strict";
import {
  analyzeTechnologyLineBindings,
  decomposeOfferBoqLine,
  materialKeyForNormalizedCircuitSpec,
  normalizeElectricalCircuitSpec,
  resolveEconomyElectricalCableV1,
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
  ELECTRICAL_CABLE_ECONOMY_QTY_FACTOR,
  FIXTURE_ELECTRICAL_CABLE_ECONOMY_PACK_ID,
  FIXTURE_ETICS_PACK_ID,
  FIXTURE_KOSTKA_PACK_ID,
  FIXTURE_PAINTING_ECONOMY_PACK_ID,
  FIXTURE_PRIMING_ECONOMY_PACK_ID,
  getPack,
  seedB0Fixtures,
  validateRecipeProvenance,
} from "../src/lib/technology-foundation/index.ts";

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

function line(over = {}) {
  return {
    lineId: "L1",
    quantity: 100,
    unit: "m",
    description: "",
    normalizedDescription: "",
    catalogWorkId: null,
    ...over,
  };
}

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  PASS ${name}`);
}

console.log("ECONOMY-ELECTRICAL-CABLE-V1");

// --- A. Exact identity normalize ---
{
  const variants = [
    "YDY 3x1,5",
    "YDY 3×1,5",
    "YDY 3x1,5mm2",
    "YDY 3x1,5 mm²",
    "Przewody kabelkowe YDY 3x1,5mm2 wciągane do rur",
  ];
  for (const v of variants) {
    const n = normalizeElectricalCircuitSpec(v);
    assert.equal(n, "YDY 3x1.5", v);
    assert.equal(materialKeyForNormalizedCircuitSpec(n), "mat.przewod_ydy_3x1_5");
  }
  ok("A exact YDY 3x1.5 variants → mat.przewod_ydy_3x1_5");
}

// --- B. YDY ≠ YDYżo ---
{
  const a = normalizeElectricalCircuitSpec("YDY 3x1,5");
  const b = normalizeElectricalCircuitSpec("YDYżo 3x1,5");
  assert.equal(a, "YDY 3x1.5");
  assert.equal(b, "YDYzo 3x1.5");
  assert.notEqual(a, b);
  assert.equal(materialKeyForNormalizedCircuitSpec(a), "mat.przewod_ydy_3x1_5");
  assert.equal(materialKeyForNormalizedCircuitSpec(b), "mat.przewod_ydyzo_3x1_5");
  ok("B YDY ≠ YDYżo separate keys");
}

// --- C. Remaining keys ---
{
  assert.equal(
    materialKeyForNormalizedCircuitSpec(normalizeElectricalCircuitSpec("Ułożenie przewodu YDYżo 3x2,5")),
    "mat.przewod_ydyzo_3x2_5",
  );
  assert.equal(
    materialKeyForNormalizedCircuitSpec(normalizeElectricalCircuitSpec("Wciąganie przewodu YDYżo 5x6 do rur")),
    "mat.przewod_ydyzo_5x6",
  );
  ok("C YDYzo 3x2.5 + 5x6 keys");
}

// --- D. No guess ---
{
  for (const d of ["Wykonanie instalacji gniazd", "Montaż oświetlenia LED", "Gniazdo wtyczkowe"]) {
    const r = resolveEconomyElectricalCableV1({ description: d });
    assert.equal(r.kind, "not_electrical", d);
    assert.equal(r.materialKey, null);
  }
  ok("D no guess gniazda/oświetlenie");
}

// --- E. Missing / OUT ---
{
  const miss = resolveEconomyElectricalCableV1({ description: "Ułożenie przewodu" });
  assert.equal(miss.kind, "parameter_required");

  const utp = resolveEconomyElectricalCableV1({ description: "Ułożenie przewodu UTP kategorii 5e" });
  assert.equal(utp.kind, "out_of_scope");

  const nhxh = resolveEconomyElectricalCableV1({
    description: "Przewody kabelkowe NHXH 3x2,5mm2 układane n.t.",
  });
  assert.equal(nhxh.kind, "out_of_scope");

  const hdgs = resolveEconomyElectricalCableV1({
    description: "Przewody kabelkowe HDGs 3x1,5mm2 układane n.t.",
  });
  assert.equal(hdgs.kind, "deferred");
  ok("E PARAMETER_REQUIRED + OUT + DEFER");
}

// --- F+G. Qty + labor coexistence via binding/BOM ---
{
  resetTf();
  const doc = {
    tenderId: "t1",
    lines: [
      line({
        lineId: "obl_ydy",
        quantity: 909,
        unit: "mb",
        description: "[E] Przewody kabelkowe YDY 3x1,5mm2 wciągane do rur m d.1 0203-01 909",
      }),
      line({
        lineId: "obl_ydyzo",
        quantity: 520,
        unit: "m",
        description: "Wciąganie przewodu YDYżo 5x6 do rur",
      }),
    ],
  };
  const r = analyzeTechnologyLineBindings(doc);
  const b1 = r.bindings.find((b) => b.lineId === "obl_ydy");
  const b2 = r.bindings.find((b) => b.lineId === "obl_ydyzo");
  assert.equal(b1?.bindStatus, "bound");
  assert.equal(b1?.materialKey, "mat.przewod_ydy_3x1_5");
  assert.equal(b2?.bindStatus, "bound");
  assert.equal(b2?.materialKey, "mat.przewod_ydyzo_5x6");

  const mats = r.mergedBom?.materials || [];
  const m1 = mats.find((m) => m.materialKey === "mat.przewod_ydy_3x1_5");
  const m2 = mats.find((m) => m.materialKey === "mat.przewod_ydyzo_5x6");
  assert.ok(m1, "bom has ydy");
  assert.ok(m2, "bom has ydyzo 5x6");
  assert.equal(m1.quantity, 909);
  assert.equal(m2.quantity, 520);
  assert.equal(ELECTRICAL_CABLE_ECONOMY_QTY_FACTOR, 1);

  // TechUnit still electrical_cable_lay (technology) + material in BOM
  const decomp = decomposeOfferBoqLine(doc.lines[1]);
  assert.equal(decomp.units[0]?.family, "electrical_cable_lay");
  ok("F+G qty 909/520 + technology+material coexistence");
}

// --- H. OUT no new keys in BOM ---
{
  resetTf();
  const doc = {
    tenderId: "t1",
    lines: [
      line({
        lineId: "u1",
        description: "Ułożenie przewodu UTP kategorii 5e",
        quantity: 1380,
      }),
      line({
        lineId: "u2",
        description: "Przewody kabelkowe NHXH 5x6mm2 układane n.t.",
        quantity: 8,
        unit: "mb",
      }),
    ],
  };
  const r = analyzeTechnologyLineBindings(doc);
  assert.ok(r.bindings.every((b) => b.bindStatus !== "bound" || !b.materialKey?.startsWith("mat.przewod_")));
  const keys = (r.mergedBom?.materials || []).map((m) => m.materialKey);
  for (const k of [
    "mat.przewod_ydy_3x1_5",
    "mat.przewod_ydyzo_3x1_5",
    "mat.przewod_ydyzo_3x2_5",
    "mat.przewod_ydyzo_5x6",
  ]) {
    assert.ok(!keys.includes(k), `OUT must not emit ${k}`);
  }
  ok("H OUT UTP/NHXH no V1 cable keys");
}

// --- CatalogWork identity pairing ---
{
  for (const [key, cw] of [
    ["mat.przewod_ydy_3x1_5", "cw.product.przewod_ydy_3x1_5"],
    ["mat.przewod_ydyzo_3x1_5", "cw.product.przewod_ydyzo_3x1_5"],
    ["mat.przewod_ydyzo_3x2_5", "cw.product.przewod_ydyzo_3x2_5"],
    ["mat.przewod_ydyzo_5x6", "cw.product.przewod_ydyzo_5x6"],
  ]) {
    const mapped = mapMaterialToMarketWork(key);
    assert.equal(mapped?.workId, cw);
    assert.equal(lookupMaterialKeyByCatalogWorkId(cw), key);
  }
  ok("CatalogWork cw.product.* ↔ materialKey pairing");
}

// --- Pack provenance / feed ---
{
  resetTf();
  const pack = getPack(FIXTURE_ELECTRICAL_CABLE_ECONOMY_PACK_ID, "1.0");
  assert.ok(pack);
  assert.equal(pack.materials.length, 4);
  assert.ok(canPackFeedProductionBom(pack));
  const v = validateRecipeProvenance(pack);
  assert.equal(v.blockingIssues.length, 0, JSON.stringify(v));
  ok("Pack ACTIVE + provenance feed BOM");
}

// --- I. Regression seeds still present ---
{
  resetTf();
  assert.ok(getPack(FIXTURE_ETICS_PACK_ID, "1.0"));
  assert.ok(getPack(FIXTURE_KOSTKA_PACK_ID, "1.0"));
  assert.ok(getPack(FIXTURE_PAINTING_ECONOMY_PACK_ID, "1.0"));
  assert.ok(getPack(FIXTURE_PRIMING_ECONOMY_PACK_ID, "1.0"));
  assert.ok(getPack(FIXTURE_ELECTRICAL_CABLE_ECONOMY_PACK_ID, "1.0"));

  // painting still binds
  const paint = analyzeTechnologyLineBindings({
    tenderId: "t",
    lines: [
      line({
        lineId: "p1",
        quantity: 100,
        unit: "m2",
        description: "Dwukrotne malowanie farbami emulsyjnymi powierzchni wewnętrznych",
      }),
    ],
  });
  assert.ok(paint.bindings.some((b) => b.bindStatus === "bound" && b.packId === FIXTURE_PAINTING_ECONOMY_PACK_ID));

  // priming still binds
  const prime = analyzeTechnologyLineBindings({
    tenderId: "t",
    lines: [
      line({
        lineId: "g1",
        quantity: 100,
        unit: "m2",
        description: "Gruntowanie podłoża z tynku pod malowanie",
      }),
    ],
  });
  assert.ok(prime.bindings.some((b) => b.bindStatus === "bound" && b.packId === FIXTURE_PRIMING_ECONOMY_PACK_ID));
  ok("I regression ETICS/kostka/painting/priming + electrical seed");
}

// --- No YDY 3x2.5 key ---
{
  const n = normalizeElectricalCircuitSpec("YDY 3x2,5");
  assert.equal(n, "YDY 3x2.5");
  assert.equal(materialKeyForNormalizedCircuitSpec(n), null);
  ok("No YDY 3x2.5 materialKey (no evidence)");
}

console.log(`\nALL ${passed} PASS`);
