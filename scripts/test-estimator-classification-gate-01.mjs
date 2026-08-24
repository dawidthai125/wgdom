/**
 * INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE — tests (deterministic · ZERO HTTP · ZERO KV).
 *
 * npx vite-node scripts/test-estimator-classification-gate-01.mjs
 */
import {
  ESTIMATOR_OWNER_CLASSIFICATION_COUNTS,
  ESTIMATOR_OWNER_CLASSIFICATION_MAP,
  assertLaborResearchAllowed,
  assertMaterialResearchAllowed,
  classifyEstimatorPricingPlane,
  isLaborGapJobAllowed,
} from "../src/lib/intelligent-estimator/index.ts";
import { runSelectiveWorkRateResearch } from "../src/lib/work-catalog/work-rate-research.ts";
import { createEmptyWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

const byPlane = { LABOR: [], MATERIAL: [], COMPOUND: [], UNKNOWN: [] };
for (const [id, plane] of Object.entries(ESTIMATOR_OWNER_CLASSIFICATION_MAP)) {
  byPlane[plane].push(id);
}

ok(
  "counts frozen 31/24/5/30",
  ESTIMATOR_OWNER_CLASSIFICATION_COUNTS.LABOR === 31 &&
    ESTIMATOR_OWNER_CLASSIFICATION_COUNTS.MATERIAL === 24 &&
    ESTIMATOR_OWNER_CLASSIFICATION_COUNTS.COMPOUND === 5 &&
    ESTIMATOR_OWNER_CLASSIFICATION_COUNTS.UNKNOWN === 30 &&
    Object.keys(ESTIMATOR_OWNER_CLASSIFICATION_MAP).length === 90,
  ESTIMATOR_OWNER_CLASSIFICATION_COUNTS,
);

ok("map LABOR count", byPlane.LABOR.length === 31, byPlane.LABOR.length);
ok(
  "map impregnacja LABOR",
  ESTIMATOR_OWNER_CLASSIFICATION_MAP["cc-w2-impregnacja-biobojcza-m2"] === "LABOR",
);
ok("map MATERIAL count", byPlane.MATERIAL.length === 24, byPlane.MATERIAL.length);
ok("map COMPOUND count", byPlane.COMPOUND.length === 5, byPlane.COMPOUND.length);
ok("map UNKNOWN count", byPlane.UNKNOWN.length === 30, byPlane.UNKNOWN.length);

let laborOk = true;
for (const id of byPlane.LABOR) {
  const c = classifyEstimatorPricingPlane({ workId: id });
  if (c.plane !== "LABOR" || !c.allowLaborResearch || c.hold) laborOk = false;
}
ok("1 all 30 LABOR → LABOR + labor path", laborOk);

let materialOk = true;
for (const id of byPlane.MATERIAL) {
  const c = classifyEstimatorPricingPlane({ workId: id });
  if (c.plane !== "MATERIAL" || !c.allowMaterialResearch || c.allowLaborResearch || c.hold) {
    materialOk = false;
  }
}
ok("2 all 24 MATERIAL → MATERIAL + material path", materialOk);

let compoundOk = true;
for (const id of byPlane.COMPOUND) {
  const c = classifyEstimatorPricingPlane({ workId: id });
  if (
    c.plane !== "COMPOUND" ||
    !c.hold ||
    c.allowLaborResearch ||
    c.allowMaterialResearch
  ) {
    compoundOk = false;
  }
}
ok("3 all 5 COMPOUND → COMPOUND HOLD", compoundOk);

let unknownOk = true;
for (const id of byPlane.UNKNOWN) {
  const c = classifyEstimatorPricingPlane({ workId: id });
  if (
    c.plane !== "UNKNOWN" ||
    !c.hold ||
    c.allowLaborResearch ||
    c.allowMaterialResearch
  ) {
    unknownOk = false;
  }
}
ok("4 all 30 UNKNOWN → UNKNOWN HOLD", unknownOk);

const laborSample = byPlane.LABOR[0];
const materialSample = byPlane.MATERIAL[0];
const compoundSample = byPlane.COMPOUND[0];
const unknownSample = byPlane.UNKNOWN[0];

ok(
  "5 LABOR → labor path flags",
  classifyEstimatorPricingPlane({ workId: laborSample }).allowLaborResearch === true,
);
ok(
  "6 MATERIAL → material path flags",
  classifyEstimatorPricingPlane({ workId: materialSample }).allowMaterialResearch === true,
);
ok(
  "7 COMPOUND → HOLD",
  classifyEstimatorPricingPlane({ workId: compoundSample }).hold === true,
);
ok(
  "8 UNKNOWN → HOLD",
  classifyEstimatorPricingPlane({ workId: unknownSample }).hold === true,
);

ok("9 labor assert rejects MATERIAL", assertLaborResearchAllowed({ workId: materialSample }).ok === false);
ok("10 labor assert rejects COMPOUND", assertLaborResearchAllowed({ workId: compoundSample }).ok === false);
ok("11 labor assert rejects UNKNOWN", assertLaborResearchAllowed({ workId: unknownSample }).ok === false);
ok("labor assert allows LABOR", assertLaborResearchAllowed({ workId: laborSample }).ok === true);

ok(
  "12 material assert rejects LABOR workId (non-mat key)",
  assertMaterialResearchAllowed({ materialKey: laborSample, catalogWorkId: laborSample }).ok ===
    false,
);
ok(
  "13 material assert rejects COMPOUND workId",
  assertMaterialResearchAllowed({
    materialKey: compoundSample,
    catalogWorkId: compoundSample,
  }).ok === false,
);
ok(
  "14 material assert rejects UNKNOWN workId",
  assertMaterialResearchAllowed({
    materialKey: unknownSample,
    catalogWorkId: unknownSample,
  }).ok === false,
);
ok(
  "material assert allows mat.* even with LABOR host",
  assertMaterialResearchAllowed({
    materialKey: "mat.glue_etics",
    catalogWorkId: laborSample,
  }).ok === true,
);
ok(
  "material assert allows MATERIAL workId",
  assertMaterialResearchAllowed({
    materialKey: materialSample,
    catalogWorkId: materialSample,
  }).ok === true,
);

ok("15 gap job only LABOR", isLaborGapJobAllowed(laborSample) === true);
ok("15b gap rejects MATERIAL", isLaborGapJobAllowed(materialSample) === false);
ok("15c gap rejects COMPOUND", isLaborGapJobAllowed(compoundSample) === false);
ok("15d gap rejects UNKNOWN", isLaborGapJobAllowed(unknownSample) === false);

// Anti-invention (A1: namePl alone → UNKNOWN; product workIds ≠ LABOR)
ok(
  "16 gniazdo antenowe name ≠ LABOR",
  classifyEstimatorPricingPlane({ namePl: "gniazdo antenowe" }).plane !== "LABOR",
);
ok(
  "17 multiswitch name ≠ LABOR",
  classifyEstimatorPricingPlane({ namePl: "multiswitch" }).plane !== "LABOR",
);
ok(
  "17b multiswitch workId = MATERIAL",
  classifyEstimatorPricingPlane({ workId: "cc-p0c-w1-multiswitch-antenowy" }).plane ===
    "MATERIAL",
);
// A1: free-text install phrases without workId → UNKNOWN (no heuristic invent)
ok(
  "18 montaż gniazda without workId → UNKNOWN (A1 no heuristic)",
  classifyEstimatorPricingPlane({ namePl: "montaż gniazda" }).plane === "UNKNOWN",
);
ok(
  "19 montaż multiswitcha without workId → UNKNOWN (A1 no heuristic)",
  classifyEstimatorPricingPlane({ namePl: "montaż multiswitcha" }).plane === "UNKNOWN",
);
ok(
  "19b Owner LABOR seed (mocowanie) = LABOR",
  classifyEstimatorPricingPlane({ workId: "cc-w2-mocowanie-aparatow" }).plane === "LABOR",
);
ok(
  "19c Owner LABOR seed (impregnacja A01-S3) = LABOR",
  classifyEstimatorPricingPlane({ workId: "cc-w2-impregnacja-biobojcza-m2" }).plane === "LABOR",
);
ok(
  "20 ambiguous / missing → UNKNOWN",
  classifyEstimatorPricingPlane({ namePl: "coś niejasnego xyz" }).plane === "UNKNOWN" &&
    classifyEstimatorPricingPlane({}).plane === "UNKNOWN",
);
ok(
  "miss workId not in map → UNKNOWN",
  classifyEstimatorPricingPlane({ workId: "totally-unknown-work-id" }).plane === "UNKNOWN",
);

// A2 — runSelectiveWorkRateResearch hard guard (null port · no HTTP)
const store = createEmptyWorkCatalogStore?.() ?? null;
async function testLaborResearchBlock() {
  if (!store) {
    // fallback minimal store shape if helper name differs
    const { loadWorkCatalogStoreLocal } = await import(
      "../src/lib/work-catalog/work-catalog-store.ts"
    );
    return loadWorkCatalogStoreLocal();
  }
  return store;
}

const researchStore = await testLaborResearchBlock();
const nullPort = {
  async lookup() {
    throw new Error("HTTP must not run when classification blocks");
  },
};

const blockedMat = await runSelectiveWorkRateResearch({
  store: researchStore,
  workId: materialSample,
  unit: "szt",
  namePl: "test",
  lookupPort: nullPort,
  bypassCooldown: true,
});
ok(
  "A2 labor research blocks MATERIAL · httpFetchCount 0",
  blockedMat.status === "BLOCKED" &&
    blockedMat.reason === "CLASSIFICATION_GATE" &&
    blockedMat.httpFetchCount === 0,
  blockedMat,
);

const blockedUnk = await runSelectiveWorkRateResearch({
  store: researchStore,
  workId: unknownSample,
  unit: "mb",
  namePl: "test",
  lookupPort: nullPort,
  bypassCooldown: true,
});
ok(
  "A2 labor research blocks UNKNOWN · no fetch",
  blockedUnk.status === "BLOCKED" && blockedUnk.httpFetchCount === 0,
  blockedUnk,
);

const blockedComp = await runSelectiveWorkRateResearch({
  store: researchStore,
  workId: compoundSample,
  unit: "mb",
  namePl: "test",
  lookupPort: nullPort,
  bypassCooldown: true,
});
ok(
  "A2 labor research blocks COMPOUND · no fetch",
  blockedComp.status === "BLOCKED" && blockedComp.httpFetchCount === 0,
  blockedComp,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
