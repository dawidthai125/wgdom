/**
 * IK-MIGRATION-01 P5.11 — Zaprawianie COMPOUND → LABOR (Owner GO).
 * Run: npx vite-node scripts/test-ik-migration-01-p511-zaprawianie-labor.mjs
 */
import { defaultAppSettings } from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
  classifyEstimatorPricingPlane,
  ESTIMATOR_OWNER_CLASSIFICATION_MAP,
  ESTIMATOR_OWNER_CLASSIFICATION_COUNTS,
  runIkMaterialIdentityP59,
  P59_ZZK_FOCUS_LINE_SPECS,
  P59_FOCUS_WORK_ZAPRAWIANIE,
} from "../src/lib/intelligent-estimator/index.ts";
import {
  isMaterialsRequiredWork,
} from "../src/lib/tender-position-cost/labor-only-classification.ts";
import { isWave1MaterialsRequiredPending } from "../src/lib/tender-position-cost/wave1-materials-required.ts";

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

forceIkEntryEnabledForTests(null);
assert("Gate A OFF", isIkEntryEnabled(defaultAppSettings) === false);
assert(
  "Gate A NG-10",
  resolveIkDetailFirstScreen({ settings: defaultAppSettings, canOpenIk: false }) === "ng10_gate",
);

const WID = P59_FOCUS_WORK_ZAPRAWIANIE;
assert("map LABOR", ESTIMATOR_OWNER_CLASSIFICATION_MAP[WID] === "LABOR");
assert("counts LABOR 30", ESTIMATOR_OWNER_CLASSIFICATION_COUNTS.LABOR === 30);
assert("counts COMPOUND 5", ESTIMATOR_OWNER_CLASSIFICATION_COUNTS.COMPOUND === 5);

const c = classifyEstimatorPricingPlane({
  workId: WID,
  namePl: "Zaprawianie bruzd",
  unit: "mb",
});
assert("plane LABOR", c.plane === "LABOR");
assert("allow labor catalog", c.allowLaborCatalogLookup === true);
assert("allow labor research", c.allowLaborResearch === true);
assert("no hold", c.hold === false);
assert("not materials required", isMaterialsRequiredWork(WID) === false);
assert("not wave1 pending", isWave1MaterialsRequiredPending(WID) === false);
assert("folia still materials required", isMaterialsRequiredWork("cc-p0c-w1-zabezpieczenie-folia") === true);

const focusZap = P59_ZZK_FOCUS_LINE_SPECS.filter((l) => l.workId === WID);
assert("focus zap lines 4", focusZap.length === 4);
assert("qty preserved", focusZap.map((l) => l.quantity).join(",") === "14.5,69.44,8.5,114.24");
assert("dwellings", focusZap.filter((l) => l.dwellingId === "ptasia").length === 2
  && focusZap.filter((l) => l.dwellingId === "zernicka").length === 2);

const report = runIkMaterialIdentityP59({ lines: focusZap });
assert("material identity 0", report.counts.trustedMaterialIdentity === 0);
assert("labor no material 4", report.counts.laborNoMaterialComponent === 4);
assert("pending 0", report.counts.pendingOwnerNorm === 0);
assert("invent 0", report.counts.inventedMaterialKeys === 0 && report.counts.inventedProducts === 0);
assert("pricing NO", report.pricing === false && report.research === false);

console.log(`\nP5.11 RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
