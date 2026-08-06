/**
 * NG-TENDERS-TECHNOLOGY-FIRST-FOUNDATION-01 Phase B0 — unit tests.
 * npx vite-node scripts/test-ng-tenders-technology-first-foundation-01-b0.mjs
 */
import {
  attemptEditPackInPlace,
  assertNoPriceTokens,
  canTransitionLifecycle,
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  composePlanRevision,
  createNextVersion,
  decideTechnologyPack,
  deepEqualCanonical,
  deriveExecutionPlan,
  eticsBoqContext,
  eticsPackV1,
  FIXTURE_ETICS_PACK_ID,
  FIXTURE_KOSTKA_PACK_ID,
  kostkaBoqContext,
  kostkaPackV1,
  normalizeTechnologyPack,
  projectBom,
  projectWorkBundle,
  registerPack,
  roundTripEqual,
  runTechnologyFoundationPipeline,
  seedB0Fixtures,
  stableStringify,
  transitionPackLifecycle,
  validateBusiness,
  validateStructural,
} from "../src/lib/technology-foundation/index.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  PASS ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${msg}`);
  }
}

function reset() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
}

reset();
const { etics, kostka } = seedB0Fixtures();

console.log("=== B0 TF-1 price forbid ===\n");

assert(
  (() => {
    try {
      assertNoPriceTokens(etics);
      return true;
    } catch {
      return false;
    }
  })(),
  "etics pack has no price tokens",
);

assert(
  (() => {
    try {
      normalizeTechnologyPack({
        ...eticsPackV1(),
        // @ts-expect-error intentional
        unitPrice: 12,
      });
      return false;
    } catch (e) {
      return String(e.message).includes("TF-1") || String(e.message).includes("price");
    }
  })(),
  "normalize rejects unitPrice key",
);

console.log("\n=== B0 fixtures ETICS + kostka ===\n");

assert(etics.packId === FIXTURE_ETICS_PACK_ID, "etics packId");
assert(kostka.packId === FIXTURE_KOSTKA_PACK_ID, "kostka packId");
assert(etics.lifecycle === "ACTIVE", "etics ACTIVE");
assert(etics.packCapabilities.includes("cap.external_thermal_insulation"), "etics capability");
assert(kostka.packCapabilities.includes("cap.paving_cubes"), "kostka capability");
assert(etics.stages.length === 3, "etics 3 stages");
assert(etics.steps.length === 4, "etics 4 steps");
assert(kostka.steps.length === 3, "kostka 3 steps");

console.log("\n=== B0 ExecutionPlan derived (TF-10) ===\n");

const ctxE = eticsBoqContext(100);
const plan1 = deriveExecutionPlan(etics, ctxE);
const plan2 = deriveExecutionPlan(etics, ctxE);
assert(plan1.planRevision === plan2.planRevision, "planRevision deterministic");
assert(plan1.planId === plan2.planId, "planId deterministic");
assert(deepEqualCanonical(plan1, plan2), "full plan deepEqual");

const ctxE2 = eticsBoqContext(200);
const planDiff = deriveExecutionPlan(etics, ctxE2);
assert(planDiff.planRevision !== plan1.planRevision, "qty change → new revision");

const shuffledCtx = {
  lines: [...ctxE.lines].reverse().map((l) => ({ ...l })),
};
assert(
  composePlanRevision(etics.packId, etics.packVersion, shuffledCtx) === plan1.planRevision,
  "canonical BoqContext order-independent",
);

console.log("\n=== B0 WorkBundle + BOM projection ===\n");

const bundle = projectWorkBundle(etics, plan1);
assert(bundle.steps.length === 4, "bundle 4 steps");
assert(bundle.steps[0].workId === "cw.etics.substrate", "bundle first workId");
assert(bundle.planRevision === plan1.planRevision, "bundle ties planRevision");

const bom = projectBom(etics, plan1, ctxE);
assert(bom.materials.length === 4, "bom materials");
assert(bom.equipment.length === 2, "bom equipment");
assert(bom.labour.length === 1, "bom labour");
assert(Math.abs(bom.materials[0].quantity - 105) < 0.001, "EPS qty 100*1.05=105");
assert(Math.abs(bom.labour[0].hours - 120) < 0.001, "labour hours 100*1.2");
assert(!("unitPrice" in bom.materials[0]), "bom line no unitPrice");

const bomK = projectBom(kostka, deriveExecutionPlan(kostka, kostkaBoqContext(50)), kostkaBoqContext(50));
assert(bomK.materials.some((m) => m.materialKey === "mat.cubes_beton"), "kostka cubes in BOM");

console.log("\n=== B0 Structural + Business + Decision ===\n");

const structOk = validateStructural(etics);
assert(structOk.blockingIssues.length === 0, "etics structural OK");

const profileOk = {
  companyCapabilityIds: [
    "cap.external_thermal_insulation",
    "cap.substrate_prep",
    "cap.finishing_coat",
    "cap.paving_cubes",
  ],
  availableEquipmentKeys: ["eq.scaffold", "eq.mixer", "eq.compactor"],
};
const bizOk = validateBusiness(etics, profileOk);
assert(bizOk.blockingIssues.length === 0, "etics business no blocking");

const allow = decideTechnologyPack(etics, profileOk);
assert(allow.decision === "degrade" || allow.decision === "allow", `decision allow/degrade got=${allow.decision}`);
// regulatory required → warning → degrade expected
assert(allow.decision === "degrade", "regulatory warning → degrade");

const denyCap = decideTechnologyPack(etics, {
  companyCapabilityIds: [],
  availableEquipmentKeys: [],
});
assert(denyCap.decision === "deny", "missing capabilities → deny");

const cyclePack = normalizeTechnologyPack({
  ...eticsPackV1(),
  packId: "pack.cycle.test",
  packVersion: "1.0",
  dependencies: [
    { predecessorStepId: "step.substrate", successorStepId: "step.glue_board" },
    { predecessorStepId: "step.glue_board", successorStepId: "step.substrate" },
  ],
});
const structCycle = validateStructural(cyclePack);
assert(
  structCycle.blockingIssues.some((i) => i.code === "STRUCT_DEP_CYCLE"),
  "cycle detected",
);

console.log("\n=== B0 Lifecycle TF-7 ===\n");

assert(canTransitionLifecycle("DRAFT", "ACTIVE"), "DRAFT→ACTIVE");
assert(canTransitionLifecycle("ACTIVE", "DEPRECATED"), "ACTIVE→DEPRECATED");
assert(!canTransitionLifecycle("ARCHIVED", "ACTIVE"), "ARCHIVED↛ACTIVE");
assert(
  (() => {
    try {
      transitionPackLifecycle(etics, "DRAFT");
      return false;
    } catch {
      return true;
    }
  })(),
  "ACTIVE→DRAFT throws",
);

console.log("\n=== B0 Versioning TF-8 / R7 ===\n");

assert(
  (() => {
    try {
      attemptEditPackInPlace(etics, { namePl: "hack" });
      return false;
    } catch (e) {
      return String(e.message).includes("TF-8");
    }
  })(),
  "attemptEditPackInPlace throws TF-8",
);

const v11 = createNextVersion(etics, { namePl: "ETICS v1.1" });
assert(v11.packVersion === "1.1", `next version 1.1 got=${v11.packVersion}`);
assert(v11.packId === etics.packId, "same packId");
assert(v11.lifecycle === "DRAFT", "new version starts DRAFT");
assert(etics.packVersion === "1.0", "previous unchanged");
assert(etics.namePl !== "ETICS v1.1", "previous name unchanged");

registerPack(v11);
assert(
  (() => {
    try {
      registerPack(v11);
      return false;
    } catch (e) {
      return String(e.message).includes("TF-8");
    }
  })(),
  "re-register same version throws",
);

console.log("\n=== B0 Serialization round-trip B0-16 ===\n");

assert(roundTripEqual(etics), "etics pack round-trip");
assert(roundTripEqual(kostka), "kostka pack round-trip");
assert(roundTripEqual(plan1), "plan round-trip");
assert(roundTripEqual(bundle), "bundle round-trip");
assert(roundTripEqual(bom), "bom round-trip");

const pipe = runTechnologyFoundationPipeline(etics, ctxE, profileOk);
assert(roundTripEqual(pipe.plan), "pipeline plan round-trip");
assert(roundTripEqual(pipe.bom), "pipeline bom round-trip");
assert(stableStringify(pipe.plan) === stableStringify(plan1), "pipeline plan == derive");

console.log("\n=== B0 Determinism C-DET ===\n");

const pipeA = runTechnologyFoundationPipeline(etics, ctxE, profileOk);
const pipeB = runTechnologyFoundationPipeline(etics, ctxE, profileOk);
assert(deepEqualCanonical(pipeA.bundle, pipeB.bundle), "bundle deterministic");
assert(deepEqualCanonical(pipeA.bom, pipeB.bom), "bom deterministic");
assert(pipeA.decision.decision === pipeB.decision.decision, "decision deterministic");

console.log(`\n=== RESULT ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
console.log("UNIT TESTS PASS");
