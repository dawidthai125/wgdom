/**
 * IK AUTONOMY-08 P2 — Research-on-Miss.
 * Run: npx vite-node scripts/test-ik-autonomy-08-p2-research-on-miss.mjs
 *
 * ZERO production KV write · ZERO live Research HTTP · ZERO Accept · ZERO business write.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultAppSettings } from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  forceIkLaborE2eForTests,
  forceIkLaborResearchForTests,
  forceIkMaterialE2eForTests,
  forceIkMaterialResearchForTests,
  isIkP5LaborE2eActive,
  isIkP5LaborExecuteResearchActive,
  isIkP6MaterialE2eActive,
  isIkP6MaterialExecuteResearchActive,
  resolveIkP5LaborExecuteResearch,
  resolveIkP6MaterialExecuteResearch,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import { researchEligible } from "../src/lib/intelligent-estimator/ik-material-expert.ts";
import { isInvoicePurchaseMaterialKey } from "../src/lib/price-intelligence/invoice-purchase-host.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, extra ?? "");
  }
}

function resetFlags() {
  forceIkEntryEnabledForTests(null);
  forceIkLaborE2eForTests(null);
  forceIkLaborResearchForTests(null);
  forceIkMaterialE2eForTests(null);
  forceIkMaterialResearchForTests(null);
}

const identity = {
  materialKey: "mat.cable.ydyp_3x2_5",
  catalogWorkId: "cw.cable.ydyp",
  labelPl: "YDYp",
  via: "materialKey",
};

function p6MayStart(p5LaborOn, laborSettledRef) {
  if (p5LaborOn && laborSettledRef !== true) return false;
  return true;
}

resetFlags();

const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const hookSrc = readSrc("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts");
const runtimeSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts");
const latchSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-p5-labor-settle-latch.ts");
const orchestraSurface = hostSrc + hookSrc + runtimeSrc + latchSrc;
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
const laborSrc = readSrc("src/lib/intelligent-estimator/ik-labor-expert.ts");
const matSrc = readSrc("src/lib/intelligent-estimator/ik-material-expert.ts");
const adminSrc = readSrc("src/app/AdminSettingsModal.tsx");
const settingsSrc = readSrc("src/lib/app-settings.ts");

// Settle lives in Orchestra (use-ik-orchestra + runtime + latch) — not Host // P5 Labor E2E blocks.
const p5Block = (() => {
  const start = hookSrc.indexOf("// P5 Labor E2E");
  const end = hookSrc.indexOf("// P6 Material E2E");
  return start >= 0 && end > start ? hookSrc.slice(start, end) : "";
})();
const p6Block = (() => {
  const start = hookSrc.indexOf("// P6 Material E2E");
  return start >= 0 ? hookSrc.slice(start, start + 2500) : "";
})();

const resolveP5 = flagSrc.slice(
  flagSrc.indexOf("export function resolveIkP5LaborExecuteResearch"),
  flagSrc.indexOf("export function isIkP5LaborExecuteResearchActive"),
);
const resolveP6 = flagSrc.slice(
  flagSrc.indexOf("export function resolveIkP6MaterialExecuteResearch"),
  flagSrc.indexOf("export function isIkP6MaterialExecuteResearchActive"),
);

// --- 1 IK OFF ---
forceIkEntryEnabledForTests(false);
forceIkLaborE2eForTests("AUTO");
forceIkMaterialE2eForTests("AUTO");
assert("1 IK OFF → Labor permission false", isIkP5LaborExecuteResearchActive() === false);
assert("1 IK OFF → Material permission false", isIkP6MaterialExecuteResearchActive() === false);

// --- 2 IK ON + AUTO + leftover research false → permission ---
forceIkEntryEnabledForTests(true);
forceIkLaborE2eForTests("AUTO");
forceIkMaterialE2eForTests("AUTO");
forceIkLaborResearchForTests(false);
forceIkMaterialResearchForTests(false);
assert("2 IK ON AUTO leftover false → Labor permission", isIkP5LaborExecuteResearchActive() === true);
assert("2 IK ON AUTO leftover false → Material permission", isIkP6MaterialExecuteResearchActive() === true);
assert("2 orchestra Labor executeResearch boolean", /executeResearch:\s*opts\.p5ResearchOn === true/.test(runtimeSrc));
assert("2 Labor MISS path reuses runIkLaborGapResearch", /runIkLaborGapResearch/.test(laborSrc));

// --- 3 HIT → ZERO Research ---
assert("3 CURRENT_HIT skips pending", /rateStatus = "CURRENT_HIT"/.test(laborSrc));
assert("3 HIT does not enqueue when CURRENT", /looked\.status === "CURRENT"/.test(laborSrc));
assert("3 Material CURRENT → PRICE_MEMORY_HIT", /usability === "CURRENT"/.test(matSrc) && /PRICE_MEMORY_HIT/.test(matSrc));

// --- 4 INTERNAL_REVIEW ---
assert("4 INTERNAL_REVIEW sets researchKey null", /rateStatus = "INTERNAL_REVIEW"[\s\S]*researchKey = null/.test(laborSrc));

// --- 5 ambiguous identity ---
assert("5 ambiguous identity no auto research", /AMBIGUOUS|without Owner Knowledge/.test(laborSrc));

// --- 6 bucket != LABOR ---
assert("6 Labor research gated on bucket LABOR", /if \(bucket === "LABOR" && workId && identity\.unit\)/.test(laborSrc));

// --- 7 cooldown ---
assert("7 Labor COOLDOWN mapped", /res\.status === "COOLDOWN"/.test(laborSrc) && /RESEARCH_COOLDOWN/.test(laborSrc));

// --- 8 session busy ---
assert("8 Labor SKIPPED_SESSION_BUSY mapped", /SKIPPED_SESSION_BUSY/.test(laborSrc));

// --- 9 technical error ≠ MISS remap ---
assert("9 Labor keep engine status (no remap to MISS)", !/rateStatus = "MISS".*technical/i.test(laborSrc));
assert("9 Material researchError kept", /row\.researchError = res\.error/.test(matSrc));

// --- 10–17 Material eligibility ---
assert("10 CURRENT HIT path present", /PRICE_MEMORY_HIT/.test(matSrc) && /executeMaterialResearchPhase2/.test(matSrc));
assert("11 MATERIAL+MATERIAL eligible", researchEligible(identity, "MATERIAL", "MATERIAL") === true);
assert("12 COMPOUND HOLD", researchEligible(identity, "BOTH", "COMPOUND") === false);
assert("13 UNKNOWN HOLD", researchEligible(identity, "UNRESOLVED", "UNKNOWN") === false);
assert("14 BOTH HOLD", researchEligible(identity, "BOTH", "COMPOUND") === false);
assert("15 UNRESOLVED HOLD", researchEligible(identity, "UNRESOLVED", "UNKNOWN") === false);
assert("15b LABOR plane HOLD", researchEligible(identity, "LABOR", "LABOR") === false);
assert("15c NON_COST HOLD", researchEligible(identity, "NON_COST", "MATERIAL") === false);
assert("16 mat.inv.* helper", isInvoicePurchaseMaterialKey("mat.inv.tile_grout") === true);
assert(
  "16 mat.inv.* researchEligible false",
  researchEligible(
    { materialKey: "mat.inv.tile_grout", catalogWorkId: "cw.inv.tile_grout", labelPl: "fuga", via: "materialKey" },
    "MATERIAL",
    "MATERIAL",
  ) === false,
);
assert("17 researchError field exists", /researchError: string \| null/.test(matSrc));
assert("17 F1 plane&&bucket in researchEligible", /plane === "MATERIAL" && bucket === "MATERIAL"/.test(matSrc));
assert("17 flagsFor untouched in classification-gate", /function flagsFor\(plane: EstimatorPricingPlane\)/.test(
  readSrc("src/lib/intelligent-estimator/classification-gate.ts"),
));

// --- 18–22 sequencing IC-SEQ-1/2 (Orchestra settle — Host blocks retired) ---
assert("18 P5 pending blocks P6", p6MayStart(true, false) === false);
assert("18b P5 Labor effect extracted from orchestra hook", p5Block.includes("executeP5LaborExpert"));
assert("18c P6 Material effect extracted from orchestra hook", p6Block.includes("executeP6MaterialExpert") || /executeP6MaterialExpert/.test(hookSrc));
assert(
  "19 cancelled does not settle (runtime cancel gate before onSettled)",
  /if \(opts\.isCancelled\(\)\) return;/.test(runtimeSrc)
    && /opts\.onSettled\(\)/.test(runtimeSrc),
);
assert(
  "19 cleanup uses p5LaborCleanupInvalidate",
  /p5LaborCleanupInvalidate\(/.test(p5Block) && /export function p5LaborCleanupInvalidate/.test(latchSrc),
);
assert(
  "19 stale predicate isP5LaborAttemptStale",
  /isP5LaborAttemptStale\(/.test(p5Block) && /export function isP5LaborAttemptStale/.test(latchSrc),
);
assert("20 P5 settled allows P6", p6MayStart(true, true) === true);
assert("20 P5 OFF allows P6", p6MayStart(false, false) === true);
assert("20 P5 OFF sets settled true", /if \(!p5LaborOn\) \{\s*laborSettledRef\.current = true/.test(p5Block));
assert("21 tender id in laborKey", /const laborKey = `\$\{/.test(p5Block) || /buildLaborAttemptKey/.test(p5Block));
assert("21 new work start sets settled false", /laborSettledRef\.current = false/.test(p5Block));
assert(
  "22 wait before materialAttemptedRef",
  p6Block.indexOf("laborSettledRef.current !== true") >= 0
    && p6Block.indexOf("materialAttemptedRef.current === materialKey")
      > p6Block.indexOf("laborSettledRef.current !== true"),
);
assert("22 wait does not write attemptedRef", /if \(p5LaborOn && laborSettledRef\.current !== true\) return;/.test(p6Block));
assert("22 laborSettleTick in P6 deps", /laborSettleTick/.test(p6Block) || /laborSettleTick/.test(hookSrc));
assert("22 not labor!==null as settled", !/labor\s*!==\s*null/.test(p6Block));
assert("22 sync ref declared", /laborSettledRef = useRef\(false\)/.test(hookSrc));
assert("22 tick state declared", /laborSettleTick/.test(hookSrc) && /setLaborSettleTick/.test(hookSrc));
assert("22 orchestra no forceRefresh on P5 call", !/runIkMasterBoqLaborExpert\(\{[\s\S]*forceRefresh/.test(runtimeSrc));
assert("22 orchestra no bypassCooldown on P5 call", !/bypassCooldown/.test(runtimeSrc));
assert(
  "22 onSettled sets laborSettledRef",
  /onSettled:\s*\(\)\s*=>\s*\{[\s\S]*laborSettledRef\.current = true/.test(p5Block),
);

// --- 23–25 autonomy ---
assert("23 no labor research checkbox", !/data-ik-labor-research-toggle/.test(adminSrc));
assert("23 no material research checkbox", !/data-ik-material-research-toggle/.test(adminSrc));
assert("24 resolve P5 has no research conjunct", !/ikLaborResearchEnabled/.test(resolveP5));
assert("24 resolve P6 has no research conjunct", !/ikMaterialResearchEnabled/.test(resolveP6));
assert("24 leftover readers unused by active helpers", !/ikLaborResearchEnabled: isIkLaborResearchEnabled/.test(flagSrc));
assert("24 leftover keys remain in AppSettings", /ikLaborResearchEnabled/.test(settingsSrc) && /ikMaterialResearchEnabled/.test(settingsSrc));
assert("24 leftover defaults stay false", defaultAppSettings().ikLaborResearchEnabled === false);
assert("25 no new IK flag", !/ikAutoResearch|ikResearchOnMiss|ikP2Research/.test(settingsSrc + flagSrc + adminSrc));
assert("25 keep both helper names", /isIkP5LaborExecuteResearchActive/.test(flagSrc) && /isIkP5LaborE2eActive/.test(flagSrc));
assert("25 P5/P6 AUTO|ON selects kept", /data-ik-labor-e2e-mode/.test(adminSrc) && /data-ik-material-e2e-mode/.test(adminSrc));
assert("25 Hub recovery panel kept", /export function IkLaborGapResearchPanel/.test(
  readSrc("src/app/ik-pricing/IkLaborGapResearchPanel.tsx"),
));
assert("25 host is not Hub trigger", !/IkLaborGapResearchPanel/.test(orchestraSurface));

// --- 26 Research ≠ Accept ---
assert("26 host no labor Accept", !/acceptWorkRateResearchCandidate/.test(orchestraSurface) && !/acceptIkLaborResearchAndNotify\(/.test(orchestraSurface));
assert("26 host no material Accept", !/acceptMaterialResearchCandidate/.test(orchestraSurface));
assert("26 labor autoAcceptExecuted = false", /autoAcceptExecuted = false/.test(laborSrc));
assert("26 material autoAcceptExecuted = false", /autoAcceptExecuted = false/.test(matSrc));
{
  const engineSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts");
  const p7Calls = engineSrc.match(/runIkP7PositionCostBid\(\{[\s\S]*?\}\)/g) ?? [];
  const p8Calls = [
    ...(hookSrc.match(/runIkP8RiskDecision\(\{[\s\S]*?\}\)/g) ?? []),
    ...(engineSrc.match(/runIkP8RiskDecision\(\{[\s\S]*?\}\)/g) ?? []),
  ];
  assert(
    "26 P7 call has no executeResearch arg",
    p7Calls.length > 0 && p7Calls.every((c) => !/executeResearch/.test(c)),
    p7Calls[0]?.slice(0, 160),
  );
  assert(
    "26 P8 call has no executeResearch arg",
    p8Calls.length > 0 && p8Calls.every((c) => !/executeResearch/.test(c)),
    p8Calls[0]?.slice(0, 160),
  );
}

assert("C3 raw enum not permission", resolveIkP5LaborExecuteResearch({
  ikEntryEnabled: true,
  ikLaborE2eEnabled: /** @type {any} */ ("AUTO"),
}) === false);
assert("C3 boolean capability", resolveIkP5LaborExecuteResearch({
  ikEntryEnabled: true,
  ikLaborE2eEnabled: true,
}) === true);
assert("C3 P6 OFF capability", resolveIkP6MaterialExecuteResearch({
  ikEntryEnabled: true,
  ikMaterialE2eEnabled: false,
}) === false);
assert("C3 P5 E2E still independent", isIkP5LaborE2eActive() === true && isIkP6MaterialE2eActive() === true);

resetFlags();

console.log(`\nAUTONOMY-08 P2: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
