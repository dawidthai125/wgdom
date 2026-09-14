/**
 * NNRNKB 1134-01/02 ATLAS UNI-GRUNT TechnologyPacks + mat.atlas_uni_grunt
 * npx vite-node scripts/test-canonical-priming-atlas-uni-grunt-aut-bom.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  canPackFeedProductionBom,
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  ensureBaselineTechnologyPacksRegistered,
  FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID,
  FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID,
  FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID,
  FIXTURE_PRIMING_ECONOMY_PACK_ID,
  FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID,
  FIXTURE_PRIMING_NNRNKB_1134_02_PACK_ID,
  getPack,
  GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
  listAllPacks,
  PAINTING_KNR_2_02_1505_01_WORK_ID,
  PAINTING_KNR_4_01_1204_02_WORK_ID,
  PRIMING_ECONOMY_FACTOR_1_COAT,
  PRIMING_NNRNKB_1134_01_MATERIAL_KEY,
  PRIMING_NNRNKB_1134_01_QTY_FACTOR_L_PER_M2,
  PRIMING_NNRNKB_1134_01_WORK_ID,
  PRIMING_NNRNKB_1134_02_MATERIAL_KEY,
  PRIMING_NNRNKB_1134_02_QTY_FACTOR_L_PER_M2,
  PRIMING_NNRNKB_1134_02_WORK_ID,
  validateRecipeProvenance,
} from "../src/lib/technology-foundation/index.ts";
import {
  findActiveTechnologyPacksForWorkId,
  resolveTechnologyBomForWork,
} from "../src/lib/tender-position-cost/bom-technology-adapter.ts";
import { evaluateAutoBomContract } from "../src/lib/intelligent-estimator/orchestra/auto-g2-accept-contract.ts";
import { isExplicitLaborOnlyWork } from "../src/lib/tender-position-cost/labor-only-classification.ts";
import {
  lookupMaterialKeyByExactAlias,
  mapMaterialToMarketWork,
} from "../src/lib/pricing-expert/material-market-map.ts";
import { assertEconomyProductHostsMapAligned } from "../src/lib/price-intelligence/economy-product-hosts-seed.ts";

const RESIDUAL = path.join(
  process.cwd(),
  ".tmp",
  "go-mops-post-rebind-residual-audit-readonly.json",
);

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  ensureBaselineTechnologyPacksRegistered();
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

resetTf();

// 1–2 material identity
{
  const entry = mapMaterialToMarketWork("mat.atlas_uni_grunt");
  ok("1. material identity exists", !!entry);
  eq("1. label ATLAS UNI-GRUNT", entry?.labelPl, "ATLAS UNI-GRUNT");
  eq("1. workId", entry?.workId, "cw.product.atlas_uni_grunt");
  eq("1. marketProductId", entry?.marketProductId, "mp.atlas_uni_grunt");
  ok(
    "2. exact alias ATLAS UNI-GRUNT",
    lookupMaterialKeyByExactAlias("ATLAS UNI-GRUNT", "l") === "mat.atlas_uni_grunt",
  );
  ok(
    "2. alias Atlas Uni-Grunt",
    lookupMaterialKeyByExactAlias("Atlas Uni-Grunt", "l") === "mat.atlas_uni_grunt",
  );
  assertEconomyProductHostsMapAligned();
  ok("2. economy hosts aligned", true);
}

// 3–8 packs
{
  const p01 = getPack(FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID, "1.0");
  const p02 = getPack(FIXTURE_PRIMING_NNRNKB_1134_02_PACK_ID, "1.0");
  ok("3. 1134-01 exact bind", p01?.steps.every((s) => s.catalogWorkId === PRIMING_NNRNKB_1134_01_WORK_ID));
  ok("4. 1134-02 exact bind", p02?.steps.every((s) => s.catalogWorkId === PRIMING_NNRNKB_1134_02_WORK_ID));
  eq("5. factor 0.21", p01?.materials[0]?.qtyFactor, PRIMING_NNRNKB_1134_01_QTY_FACTOR_L_PER_M2);
  eq("6. factor 0.22", p02?.materials[0]?.qtyFactor, PRIMING_NNRNKB_1134_02_QTY_FACTOR_L_PER_M2);
  eq("5. material key 01", p01?.materials[0]?.materialKey, PRIMING_NNRNKB_1134_01_MATERIAL_KEY);
  eq("6. material key 02", p02?.materials[0]?.materialKey, PRIMING_NNRNKB_1134_02_MATERIAL_KEY);
  eq("7. unit l", p01?.materials[0]?.unit, "l");
  ok("8. ACTIVE", p01?.lifecycle === "ACTIVE" && p02?.lifecycle === "ACTIVE");
  ok("8. canFeed", canPackFeedProductionBom(p01) && canPackFeedProductionBom(p02));
  eq("8. singleton 01", findActiveTechnologyPacksForWorkId(PRIMING_NNRNKB_1134_01_WORK_ID).length, 1);
  eq("8. singleton 02", findActiveTechnologyPacksForWorkId(PRIMING_NNRNKB_1134_02_WORK_ID).length, 1);
}

// 9–10 BOM + AutoBom
{
  for (const [workId, packId, factor] of [
    [PRIMING_NNRNKB_1134_01_WORK_ID, FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID, 0.21],
    [PRIMING_NNRNKB_1134_02_WORK_ID, FIXTURE_PRIMING_NNRNKB_1134_02_PACK_ID, 0.22],
  ]) {
    const bom = resolveTechnologyBomForWork({
      workId,
      unit: "m2",
      positionQuantity: 10,
    });
    ok(`9. BOM OK ${workId}`, bom.status === "OK");
    eq(`9. pack ${workId}`, bom.packId, packId);
    eq(`9. qty ${workId}`, bom.components[0]?.quantityPerUnit, factor);
    ok(`9. material atlas ${workId}`, bom.components[0]?.materialKey === "mat.atlas_uni_grunt");

    const r = evaluateAutoBomContract({
      line: {
        lineId: "t",
        catalogWorkId: workId,
        unit: "m2",
        quantity: 5,
        description: "grunt",
        matchMethod: "auto_contract",
        matchedBy: "auto_contract",
        matchConfidence: "high",
      },
      positionQuantity: 5,
      packs: listAllPacks(),
      discoveryStore: null,
      nowMs: Date.now(),
      requireTrustedIdentity: false,
    });
    ok(`10. AUTO_BOM_ACCEPT ${workId}`, r.decision === "AUTO_BOM_ACCEPT");
    ok(`10. TECHNOLOGY_PACK ${workId}`, r.provenance?.mode === "TECHNOLOGY_PACK");
  }
}

// 11 no PLN in pack
{
  for (const id of [
    FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID,
    FIXTURE_PRIMING_NNRNKB_1134_02_PACK_ID,
  ]) {
    const p = getPack(id, "1.0");
    ok(`11. no price ${id}`, !/unitPrice|pricePln|sellPln|purchasePln/i.test(JSON.stringify(p)));
  }
}

// 12 orientation preserved — separate packs / factors
{
  const f01 = findActiveTechnologyPacksForWorkId(PRIMING_NNRNKB_1134_01_WORK_ID)[0];
  const f02 = findActiveTechnologyPacksForWorkId(PRIMING_NNRNKB_1134_02_WORK_ID)[0];
  ok("12. different packIds", f01.packId !== f02.packId);
  ok("12. different factors", f01.materials[0].qtyFactor !== f02.materials[0].qtyFactor);
}

// 13 deterministic
{
  const a = resolveTechnologyBomForWork({
    workId: PRIMING_NNRNKB_1134_01_WORK_ID,
    unit: "m2",
    positionQuantity: 8,
  });
  const b = resolveTechnologyBomForWork({
    workId: PRIMING_NNRNKB_1134_01_WORK_ID,
    unit: "m2",
    positionQuantity: 8,
  });
  eq("13. deterministic", a.components[0]?.totalQuantity, b.components[0]?.totalQuantity);
}

// 14 paint packs unchanged
{
  eq(
    "14. paint 1204",
    findActiveTechnologyPacksForWorkId(PAINTING_KNR_4_01_1204_02_WORK_ID)[0]?.packId,
    FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID,
  );
  eq(
    "14. paint 1505",
    findActiveTechnologyPacksForWorkId(PAINTING_KNR_2_02_1505_01_WORK_ID)[0]?.packId,
    FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID,
  );
  const b1204 = resolveTechnologyBomForWork({
    workId: PAINTING_KNR_4_01_1204_02_WORK_ID,
    unit: "m2",
    positionQuantity: 10,
  });
  ok("14. paint BOM still OK", b1204.status === "OK");
}

// 15 0815-05
{
  const g = getPack(FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID, "1.0");
  ok("15. gypsum ACTIVE", g?.lifecycle === "ACTIVE");
  eq(
    "15. gypsum pack",
    findActiveTechnologyPacksForWorkId(GYPSUM_SKIM_CEILING_0815_05_WORK_ID)[0]?.packId,
    FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID,
  );
}

// FAIL 16 — mat.grunt generic alias
{
  const p01 = getPack(FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID, "1.0");
  ok("16. not mat.grunt", p01?.materials.every((m) => m.materialKey !== "mat.grunt"));
  ok(
    "16. Grunt uniwersalny still mat.grunt",
    lookupMaterialKeyByExactAlias("Grunt uniwersalny", "l") === "mat.grunt",
  );
  ok(
    "16. ATLAS not mat.grunt",
    lookupMaterialKeyByExactAlias("ATLAS UNI-GRUNT", "l") !== "mat.grunt",
  );
}

// FAIL 17–18 collapse
{
  ok(
    "17. 1134-01 packs do not include 1134-02 step",
    !getPack(FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID, "1.0")?.steps.some(
      (s) => s.catalogWorkId === PRIMING_NNRNKB_1134_02_WORK_ID,
    ),
  );
  ok(
    "18. 1134-02 packs do not include 1134-01 step",
    !getPack(FIXTURE_PRIMING_NNRNKB_1134_02_PACK_ID, "1.0")?.steps.some(
      (s) => s.catalogWorkId === PRIMING_NNRNKB_1134_01_WORK_ID,
    ),
  );
}

// FAIL 19–20 kg / density
{
  const p01 = getPack(FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID, "1.0");
  ok("19. unit is l not kg", p01?.materials[0]?.unit === "l");
  ok("19. factor not kg range 0.05–0.2 as substitute", p01?.materials[0]?.qtyFactor === 0.21);
  ok(
    "20. source ref forbids density convert",
    /NOT_KG_M2_DENSITY_CONVERT/.test(p01?.materials[0]?.factorSourceRef || ""),
  );
}

// FAIL 21 labour ≠ OUR RATE
{
  ok("21. not LABOR_ONLY", !isExplicitLaborOnlyWork(PRIMING_NNRNKB_1134_01_WORK_ID));
  const p01 = getPack(FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID, "1.0");
  ok("21. tech hours 0.06", p01?.labour[0]?.hoursPerUnit === 0.06);
  ok("21. no ourRate on labour", !(p01?.labour || []).some((l) => "ourRatePln" in l));
}

// FAIL 22 price
{
  const blob = JSON.stringify(getPack(FIXTURE_PRIMING_NNRNKB_1134_02_PACK_ID, "1.0")?.materials);
  ok("22. no PLN in materials", !/PLN|zł|price/i.test(blob));
}

// FAIL 23 legacy priming
{
  const legacy = getPack(FIXTURE_PRIMING_ECONOMY_PACK_ID, "1.0");
  eq("23. legacy still legacy-gruntowanie-m2", legacy?.steps[0]?.catalogWorkId, "legacy-gruntowanie-m2");
  ok(
    "23. legacy still mat.grunt",
    legacy?.materials.some((m) => m.materialKey === "mat.grunt"),
  );
  ok(
    "23. legacy not retargeted to 1134",
    !legacy?.steps.some(
      (s) =>
        s.catalogWorkId === PRIMING_NNRNKB_1134_01_WORK_ID ||
        s.catalogWorkId === PRIMING_NNRNKB_1134_02_WORK_ID,
    ),
  );
  ok("23. economy factor still 0.10", legacy?.materials.some((m) => m.qtyFactor === PRIMING_ECONOMY_FACTOR_1_COAT));
}

// FAIL 24 0815
{
  const bom = resolveTechnologyBomForWork({
    workId: GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
    unit: "m2",
    positionQuantity: 10,
  });
  ok("24. gypsum BOM OK", bom.status === "OK");
}

// Local production simulation — 12/12 paint+prime
{
  assert.ok(fs.existsSync(RESIDUAL), "residual present");
  const residual = JSON.parse(fs.readFileSync(RESIDUAL, "utf8"));
  const targets = (residual.G_BOM_GAPS || []).filter((g) =>
    [
      PAINTING_KNR_4_01_1204_02_WORK_ID,
      PAINTING_KNR_2_02_1505_01_WORK_ID,
      PRIMING_NNRNKB_1134_01_WORK_ID,
      PRIMING_NNRNKB_1134_02_WORK_ID,
    ].includes(g.catalogWorkId),
  );
  eq("sim 12 target lines in residual", targets.length, 12);
  let okBom = 0;
  for (const g of targets) {
    const bom = resolveTechnologyBomForWork({
      workId: g.catalogWorkId,
      unit: "m2",
      positionQuantity: 10,
    });
    if (bom.status === "OK") okBom += 1;
  }
  eq("sim 12/12 BOM OK locally", okBom, 12);

  const rates = residual.I_RATE_INVARIANTS || {};
  eq("rate 1134-01", rates[PRIMING_NNRNKB_1134_01_WORK_ID]?.ourRatePln, 1.04);
  eq("rate 1134-02", rates[PRIMING_NNRNKB_1134_02_WORK_ID]?.ourRatePln, 1.39);
  eq("rate 0815-05", rates[GYPSUM_SKIM_CEILING_0815_05_WORK_ID]?.ourRatePln, 22.88);
  eq("rebind ok", residual.H_CANONICAL_REBIND_REGRESSION?.ok, 12);
  eq("rebind legacyReverted", residual.H_CANONICAL_REBIND_REGRESSION?.legacyReverted, 0);
}

// provenance
{
  for (const id of [
    FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID,
    FIXTURE_PRIMING_NNRNKB_1134_02_PACK_ID,
  ]) {
    const v = validateRecipeProvenance(getPack(id, "1.0"));
    ok(`provenance ${id}`, (v.blockingIssues || []).length === 0);
  }
}

console.log(`\nALL PASS (${passed})`);
