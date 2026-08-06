/**
 * NG-TENDERS-TECHNOLOGY-FIRST-FOUNDATION-01 Phase B0 — harness.
 * npx vite-node scripts/ng-tenders-technology-first-foundation-01-b0-harness.mjs
 */
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  eticsBoqContext,
  kostkaBoqContext,
  runTechnologyFoundationPipeline,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";

clearPackRegistryForTests();
clearDefinitionRegistryForTests();
clearCapabilityRegistryForTests();

const { etics, kostka } = seedB0Fixtures();

const profile = {
  companyCapabilityIds: [
    "cap.external_thermal_insulation",
    "cap.substrate_prep",
    "cap.finishing_coat",
    "cap.paving_cubes",
  ],
  availableEquipmentKeys: ["eq.scaffold", "eq.mixer", "eq.compactor"],
};

const eticsPipe = runTechnologyFoundationPipeline(etics, eticsBoqContext(120), profile);
const kostkaPipe = runTechnologyFoundationPipeline(kostka, kostkaBoqContext(40), profile);

console.log("=== TF Foundation B0 Harness ===");
console.log(
  `ETICS plan=${eticsPipe.plan.planRevision} steps=${eticsPipe.bundle.steps.length} bomMat=${eticsPipe.bom.materials.length} decision=${eticsPipe.decision.decision}`,
);
console.log(
  `KOSTKA plan=${kostkaPipe.plan.planRevision} steps=${kostkaPipe.bundle.steps.length} bomMat=${kostkaPipe.bom.materials.length} decision=${kostkaPipe.decision.decision}`,
);

const ok =
  eticsPipe.bundle.steps.length >= 3 &&
  kostkaPipe.bundle.steps.length >= 2 &&
  eticsPipe.bom.materials.length >= 1 &&
  kostkaPipe.bom.materials.length >= 1 &&
  eticsPipe.structural.blockingIssues.length === 0 &&
  kostkaPipe.structural.blockingIssues.length === 0 &&
  eticsPipe.decision.decision !== "deny" &&
  kostkaPipe.decision.decision !== "deny" &&
  eticsPipe.plan.planRevision !== kostkaPipe.plan.planRevision;

if (!ok) {
  console.error("HARNESS FAIL");
  console.error(
    JSON.stringify(
      {
        etics: {
          decision: eticsPipe.decision.decision,
          struct: eticsPipe.structural,
          biz: eticsPipe.business,
        },
        kostka: {
          decision: kostkaPipe.decision.decision,
          struct: kostkaPipe.structural,
          biz: kostkaPipe.business,
        },
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log("\nHARNESS PASS");
