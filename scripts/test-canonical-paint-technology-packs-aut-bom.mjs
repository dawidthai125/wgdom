/**
 * Canonical paint TechnologyPacks — KNR 4-01 1204-02 + KNR 2-02 1505-01
 * NNRNKB 1134-01/02 = MATERIAL_IDENTITY_REQUIRED (not implemented)
 *
 * npx vite-node scripts/test-canonical-paint-technology-packs-aut-bom.mjs
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
  FIXTURE_PAINTING_ECONOMY_PACK_ID,
  FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID,
  FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID,
  FIXTURE_PRIMING_ECONOMY_PACK_ID,
  getPack,
  GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
  listAllPacks,
  PAINTING_ECONOMY_FACTOR_2_COATS,
  PAINTING_KNR_2_02_1505_01_MATERIAL_KEY,
  PAINTING_KNR_2_02_1505_01_QTY_FACTOR_L_PER_M2,
  PAINTING_KNR_2_02_1505_01_WORK_ID,
  PAINTING_KNR_4_01_1204_02_MATERIAL_KEY,
  PAINTING_KNR_4_01_1204_02_QTY_FACTOR_L_PER_M2,
  PAINTING_KNR_4_01_1204_02_WORK_ID,
  seedPaintingKnr202150501V1,
  seedPaintingKnr401120402V1,
  validateRecipeProvenance,
} from "../src/lib/technology-foundation/index.ts";
import {
  findActiveTechnologyPacksForWorkId,
  resolveTechnologyBomForWork,
} from "../src/lib/tender-position-cost/bom-technology-adapter.ts";
import { evaluateAutoBomContract } from "../src/lib/intelligent-estimator/orchestra/auto-g2-accept-contract.ts";
import { isExplicitLaborOnlyWork } from "../src/lib/tender-position-cost/labor-only-classification.ts";

const W1134_01 = "cw.knr.nnrnkb.1134-01.m2";
const W1134_02 = "cw.knr.nnrnkb.1134-02.m2";
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

// --- PASS 1–2: packs resolve BOM ---
{
  const bom = resolveTechnologyBomForWork({
    workId: PAINTING_KNR_4_01_1204_02_WORK_ID,
    unit: "m2",
    positionQuantity: 10,
  });
  ok("1. 1204-02 BOM OK", bom.status === "OK");
  eq("1. packId", bom.packId, FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID);
}

{
  const bom = resolveTechnologyBomForWork({
    workId: PAINTING_KNR_2_02_1505_01_WORK_ID,
    unit: "m2",
    positionQuantity: 10,
  });
  ok("2. 1505-01 BOM OK", bom.status === "OK");
  eq("2. packId", bom.packId, FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID);
}

// --- PASS 3–4: 1134 now resolve via ATLAS UNI-GRUNT packs (follow-up GO) ---
{
  const b1 = resolveTechnologyBomForWork({
    workId: W1134_01,
    unit: "m2",
    positionQuantity: 10,
  });
  const b2 = resolveTechnologyBomForWork({
    workId: W1134_02,
    unit: "m2",
    positionQuantity: 10,
  });
  ok("3. 1134-01 BOM OK (atlas uni-grunt pack)", b1.status === "OK");
  ok("4. 1134-02 BOM OK (atlas uni-grunt pack)", b2.status === "OK");
  ok("3. pack is priming 1134-01", b1.packId === "pack.priming.nnrnkb_1134_01_v1");
  ok("4. pack is priming 1134-02", b2.packId === "pack.priming.nnrnkb_1134_02_v1");
}

// --- PASS 5: exact factors ---
{
  const bom1204 = resolveTechnologyBomForWork({
    workId: PAINTING_KNR_4_01_1204_02_WORK_ID,
    unit: "m2",
    positionQuantity: 10,
  });
  const c = bom1204.components.find(
    (x) => x.materialKey === PAINTING_KNR_4_01_1204_02_MATERIAL_KEY,
  );
  eq("5a. 1204-02 qtyFactor", c?.quantityPerUnit, PAINTING_KNR_4_01_1204_02_QTY_FACTOR_L_PER_M2);
  eq("5a. total 2.86 L / 10 m2", c?.totalQuantity, 2.86);

  const bom1505 = resolveTechnologyBomForWork({
    workId: PAINTING_KNR_2_02_1505_01_WORK_ID,
    unit: "m2",
    positionQuantity: 10,
  });
  const c2 = bom1505.components.find(
    (x) => x.materialKey === PAINTING_KNR_2_02_1505_01_MATERIAL_KEY,
  );
  eq("5b. 1505-01 qtyFactor", c2?.quantityPerUnit, PAINTING_KNR_2_02_1505_01_QTY_FACTOR_L_PER_M2);
  eq(
    "5b. total 2.891 L / 10 m2",
    c2?.totalQuantity,
    Number((10 * PAINTING_KNR_2_02_1505_01_QTY_FACTOR_L_PER_M2).toFixed(6)),
  );
}

// --- PASS 6–8: exact bind, unit, ACTIVE singleton ---
{
  const p1204 = getPack(FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID, "1.0");
  const p1505 = getPack(FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID, "1.0");
  ok("6a. 1204 bind exact", p1204?.steps.every((s) => s.catalogWorkId === PAINTING_KNR_4_01_1204_02_WORK_ID));
  ok("6b. 1505 bind exact", p1505?.steps.every((s) => s.catalogWorkId === PAINTING_KNR_2_02_1505_01_WORK_ID));
  ok("7. packs ACTIVE", p1204?.lifecycle === "ACTIVE" && p1505?.lifecycle === "ACTIVE");
  ok("7. canFeed", canPackFeedProductionBom(p1204) && canPackFeedProductionBom(p1505));
  eq("8a. singleton 1204", findActiveTechnologyPacksForWorkId(PAINTING_KNR_4_01_1204_02_WORK_ID).length, 1);
  eq("8b. singleton 1505", findActiveTechnologyPacksForWorkId(PAINTING_KNR_2_02_1505_01_WORK_ID).length, 1);
}

// --- PASS 9: no PLN in pack / PriceMemory separate ---
{
  const p1204 = getPack(FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID, "1.0");
  const blob = JSON.stringify(p1204);
  ok("9. no unitPrice/PLN in recipe", !/unitPrice|pricePln|sellPln|purchasePln/i.test(blob));
}

// --- PASS 10–11: production package simulation (6 paint lines / 3 dwellings) ---
{
  assert.ok(fs.existsSync(RESIDUAL), "residual audit artefact present");
  const residual = JSON.parse(fs.readFileSync(RESIDUAL, "utf8"));
  const paintGaps = (residual.G_BOM_GAPS || []).filter(
    (g) =>
      g.catalogWorkId === PAINTING_KNR_4_01_1204_02_WORK_ID ||
      g.catalogWorkId === PAINTING_KNR_2_02_1505_01_WORK_ID,
  );
  eq("10. residual paint target lines", paintGaps.length, 6);
  const dwellings = new Set(paintGaps.map((g) => g.dwellingId));
  eq("11. 3 dwellings", dwellings.size, 3);

  for (const g of paintGaps) {
    const bom = resolveTechnologyBomForWork({
      workId: g.catalogWorkId,
      unit: "m2",
      positionQuantity: 10,
    });
    ok(`10. resolve ${g.dwellingId}/${g.lineId}`, bom.status === "OK");
  }
}

// --- PASS 12: deterministic ---
{
  const a = resolveTechnologyBomForWork({
    workId: PAINTING_KNR_4_01_1204_02_WORK_ID,
    unit: "m2",
    positionQuantity: 7,
  });
  const b = resolveTechnologyBomForWork({
    workId: PAINTING_KNR_4_01_1204_02_WORK_ID,
    unit: "m2",
    positionQuantity: 7,
  });
  eq("12. deterministic status", a.status, b.status);
  eq("12. deterministic total", a.components[0]?.totalQuantity, b.components[0]?.totalQuantity);
}

// --- FAIL 13–15: wrong / legacy / fuzzy ---
{
  const wrong = resolveTechnologyBomForWork({
    workId: "cw.knr.knr-4-01.1204-99.m2",
    unit: "m2",
    positionQuantity: 10,
  });
  ok("13. wrong catalogWorkId → MISSING_BOM", wrong.status === "MISSING_BOM");

  const legacy = findActiveTechnologyPacksForWorkId("legacy-malowanie-m2");
  ok(
    "14. legacy still economy pack only",
    legacy.length === 1 && legacy[0].packId === FIXTURE_PAINTING_ECONOMY_PACK_ID,
  );
  ok(
    "14. new packs do not bind legacy",
    !legacy.some(
      (p) =>
        p.packId === FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID ||
        p.packId === FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID,
    ),
  );

  // Fuzzy description must not invent a pack — resolver is workId-only
  const fuzzy = findActiveTechnologyPacksForWorkId("malowanie ścian emulsją");
  ok("15. fuzzy description → 0 packs", fuzzy.length === 0);
}

// --- FAIL 16–17: 1134 orientation isolation (separate packs) ---
{
  const f01 = findActiveTechnologyPacksForWorkId(W1134_01);
  const f02 = findActiveTechnologyPacksForWorkId(W1134_02);
  eq("16. 1134-01 singleton", f01.length, 1);
  eq("17. 1134-02 singleton", f02.length, 1);
  ok("16. no collapse 01→02", f01[0]?.packId === "pack.priming.nnrnkb_1134_01_v1");
  ok("17. no collapse 02→01", f02[0]?.packId === "pack.priming.nnrnkb_1134_02_v1");
  ok("16/17 different packs", f01[0]?.packId !== f02[0]?.packId);
}

// --- FAIL 18: economy factor not substituted ---
{
  const p1204 = getPack(FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID, "1.0");
  const factors = (p1204?.materials || []).map((m) => m.qtyFactor);
  ok("18a. no economy 0.166667 on 1204", !factors.includes(PAINTING_ECONOMY_FACTOR_2_COATS));
  ok("18a. has 0.286", factors.includes(PAINTING_KNR_4_01_1204_02_QTY_FACTOR_L_PER_M2));
  const p1505 = getPack(FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID, "1.0");
  const f2 = (p1505?.materials || []).map((m) => m.qtyFactor);
  ok("18b. no economy on 1505", !f2.includes(PAINTING_ECONOMY_FACTOR_2_COATS));
  ok("18b. has 0.2891", f2.includes(PAINTING_KNR_2_02_1505_01_QTY_FACTOR_L_PER_M2));
}

// --- FAIL 19: labour ≠ OUR RATE / not labor-only invent ---
{
  ok("19. not LABOR_ONLY allowlist", !isExplicitLaborOnlyWork(PAINTING_KNR_4_01_1204_02_WORK_ID));
  const p1204 = getPack(FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID, "1.0");
  ok("19. labour hours present as tech norm", (p1204?.labour || [])[0]?.hoursPerUnit === 0.119);
  ok("19. no ourRate/pln on labour", !(p1204?.labour || []).some((l) => "ourRatePln" in l || "pln" in l));
}

// --- FAIL 20: no material price in recipe ---
{
  const packs = [
    getPack(FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID, "1.0"),
    getPack(FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID, "1.0"),
  ];
  for (const p of packs) {
    ok(`20. ${p.packId} no price fields`, !/price|PLN|zł/i.test(JSON.stringify(p.materials)));
  }
}

// --- FAIL 21: 0815-05 unchanged ---
{
  const g = getPack(FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID, "1.0");
  ok("21. gypsum pack still ACTIVE", g?.lifecycle === "ACTIVE");
  ok(
    "21. gypsum bind unchanged",
    g?.steps.some((s) => s.catalogWorkId === GYPSUM_SKIM_CEILING_0815_05_WORK_ID),
  );
  const found = findActiveTechnologyPacksForWorkId(GYPSUM_SKIM_CEILING_0815_05_WORK_ID);
  eq("21. gypsum singleton", found.length, 1);
  eq("21. gypsum packId", found[0]?.packId, FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID);
}

// --- AutoBom ACCEPT for paint leaves ---
{
  const packs = listAllPacks();
  for (const [workId, packId] of [
    [PAINTING_KNR_4_01_1204_02_WORK_ID, FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID],
    [PAINTING_KNR_2_02_1505_01_WORK_ID, FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID],
  ]) {
    const r = evaluateAutoBomContract({
      line: {
        lineId: "t",
        catalogWorkId: workId,
        unit: "m2",
        quantity: 5,
        description: "test",
        matchMethod: "auto_contract",
        matchedBy: "auto_contract",
        matchConfidence: "high",
      },
      positionQuantity: 5,
      packs,
      discoveryStore: null,
      nowMs: Date.now(),
      requireTrustedIdentity: false,
    });
    ok(`AutoBom ACCEPT ${workId}`, r.decision === "AUTO_BOM_ACCEPT");
    ok(`AutoBom TECHNOLOGY_PACK ${workId}`, r.provenance?.mode === "TECHNOLOGY_PACK");
    eq(`AutoBom pack ${workId}`, r.provenance?.packId, packId);
  }
}

// --- provenance validate ---
{
  const p1204 = getPack(FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID, "1.0");
  const p1505 = getPack(FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID, "1.0");
  const v1 = validateRecipeProvenance(p1204);
  const v2 = validateRecipeProvenance(p1505);
  ok("provenance 1204", (v1.blockingIssues || []).length === 0);
  ok("provenance 1505", (v2.blockingIssues || []).length === 0);
}

// --- seed idempotent + legacy priming untouched ---
{
  seedPaintingKnr401120402V1();
  seedPaintingKnr202150501V1();
  eq(
    "idempotent seed 1204",
    listAllPacks().filter((p) => p.packId === FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID).length,
    1,
  );
  const priming = getPack(FIXTURE_PRIMING_ECONOMY_PACK_ID, "1.0");
  ok("legacy priming still legacy-gruntowanie only", priming?.steps[0]?.catalogWorkId === "legacy-gruntowanie-m2");
}

// --- rate invariant snapshot from residual (read-only) ---
{
  const residual = JSON.parse(fs.readFileSync(RESIDUAL, "utf8"));
  const rates = residual.I_RATE_INVARIANTS || {};
  eq("rate 1204-02", rates[PAINTING_KNR_4_01_1204_02_WORK_ID]?.ourRatePln, 3.72);
  eq("rate 1505-01", rates[PAINTING_KNR_2_02_1505_01_WORK_ID]?.ourRatePln, 1.18);
  eq("rate 1134-01", rates[W1134_01]?.ourRatePln, 1.04);
  eq("rate 1134-02", rates[W1134_02]?.ourRatePln, 1.39);
  eq("rate 0815-05", rates[GYPSUM_SKIM_CEILING_0815_05_WORK_ID]?.ourRatePln, 22.88);
  eq("rate legacy-malowanie", rates["legacy-malowanie-m2"]?.ourRatePln, 22.9);
}

console.log(`\nALL PASS (${passed})`);
