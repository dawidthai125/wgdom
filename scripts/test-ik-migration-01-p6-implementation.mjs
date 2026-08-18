/**
 * IK-MIGRATION-01 P6 IMPLEMENTATION — Material E2E under IK.
 * Run: npx vite-node scripts/test-ik-migration-01-p6-implementation.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  defaultAppSettings,
  mergeAppSettings,
} from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  forceIkMaterialE2eForTests,
  forceIkMaterialResearchForTests,
  forceIkLaborE2eForTests,
  forceIkChiefWiringForTests,
  isIkP6MaterialE2eActive,
  isIkP6MaterialExecuteResearchActive,
  resolveIkP6MaterialExecuteResearch,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import {
  IK_P6_MAX_ACTIVE_CLAIMS_PER_PASS,
  IK_P6_MAX_SHOP_HTTP_PER_RUN,
  IkP6MaterialBudget,
} from "../src/lib/intelligent-estimator/ik-p6-material-budget.ts";

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

function runSuite(rel) {
  const r2 = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite-node", rel],
    { cwd: root, encoding: "utf8", shell: true },
  );
  const out = (r2.stdout || "") + (r2.stderr || "");
  const ok = r2.status === 0 && /PASS|0 FAIL|PASS \/ 0 FAIL/i.test(out);
  return { ok, out: out.slice(-500) };
}

forceIkEntryEnabledForTests(null);
forceIkMaterialE2eForTests(null);
forceIkMaterialResearchForTests(null);
forceIkLaborE2eForTests(null);
forceIkChiefWiringForTests(null);

const d = defaultAppSettings();
assert("A P6 AUTO defaults", d.ikMaterialE2eEnabled === "AUTO" && d.ikMaterialResearchEnabled === false);
forceIkEntryEnabledForTests(true);
forceIkMaterialE2eForTests("AUTO");
forceIkMaterialResearchForTests(false);
assert("A2 P6 AUTO active", isIkP6MaterialE2eActive() === true);
assert("A3 leftover research false does not block permission", isIkP6MaterialExecuteResearchActive() === true);

forceIkEntryEnabledForTests(true);
forceIkMaterialE2eForTests(true);
forceIkMaterialResearchForTests(false);
assert("B MODE A flags", isIkP6MaterialE2eActive() === true && isIkP6MaterialExecuteResearchActive() === true);
assert(
  "B executeResearch resolve Entry∧E2E",
  resolveIkP6MaterialExecuteResearch({
    ikEntryEnabled: true,
    ikMaterialE2eEnabled: true,
  }) === true,
);

forceIkMaterialResearchForTests(true);
assert("C leftover research true still permission ON", isIkP6MaterialExecuteResearchActive() === true);
assert(
  "C resolve true Entry∧E2E",
  resolveIkP6MaterialExecuteResearch({
    ikEntryEnabled: true,
    ikMaterialE2eEnabled: true,
  }) === true,
);
assert(
  "J Entry OFF false",
  resolveIkP6MaterialExecuteResearch({
    ikEntryEnabled: false,
    ikMaterialE2eEnabled: true,
  }) === false,
);

forceIkMaterialE2eForTests(null);
forceIkMaterialResearchForTests(null);
forceIkEntryEnabledForTests(null);

const matSrc = readSrc("src/lib/intelligent-estimator/ik-material-expert.ts");
assert("L executeResearch === true (not !== false)", /executeResearch === true/.test(matSrc));
assert("L no default true via !== false", !/executeResearch !== false/.test(matSrc));

const orchSrc = readSrc("src/lib/price-intelligence/market-material-research-orchestrate.ts");
assert("L2 orchestrate === true", /executeResearch === true/.test(orchSrc));
assert("L2 orch no !== false", !/executeResearch !== false/.test(orchSrc));

const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
assert("N host passes executeResearch: p6ResearchOn === true", /executeResearch:\s*p6ResearchOn === true/.test(hostSrc));
assert("N Material uses p6MaterialOn", /isIkP6MaterialE2eActive/.test(hostSrc));
assert("N RUN_RATE_EXPERTS stays false", /IK_ENTRY_SHELL_RUN_RATE_EXPERTS = false/.test(hostSrc));
assert("N Labor still p5LaborOn", /isIkP5LaborE2eActive/.test(hostSrc));
assert("N markers p6", /data-ik-p6-material-e2e/.test(hostSrc) && /data-ik-p6-material-research/.test(hostSrc));

assert("T claims=8", IK_P6_MAX_ACTIVE_CLAIMS_PER_PASS === 8);
assert("T shop HTTP=24", IK_P6_MAX_SHOP_HTTP_PER_RUN === 24);

const budget = new IkP6MaterialBudget();
for (let i = 0; i < 8; i++) budget.recordClaim(3);
assert("T claim ceiling blocks 9th", budget.canClaim(3) === false);

const budget2 = new IkP6MaterialBudget();
budget2.recordClaim(22);
assert("T shop ceiling blocks next 3", budget2.canClaim(3) === false);

assert("AA autoAccept false in expert", /autoAcceptExecuted = false/.test(matSrc));
assert("AB Accept → Price Memory path", /acceptMaterialResearchCandidate/.test(matSrc));
assert("AC CatalogWork 471 lock DF", /CatalogWork \*\*471\*\*/.test(readSrc("docs/architecture/IK-MIGRATION-01-P6-PLAN-DESIGN-FREEZE.md")));
assert("AD no OUR RATE invent from material", !/acceptIkLaborResearchAndNotify\(/.test(matSrc));

assert("Admin P6 E2E toggle kept", /data-ik-material-e2e-toggle/.test(readSrc("src/app/AdminSettingsModal.tsx")));
assert("Admin P6 Research checkbox absent", !/data-ik-material-research-toggle/.test(readSrc("src/app/AdminSettingsModal.tsx")));

const merged = mergeAppSettings(
  { ikMaterialE2eEnabled: true, ikMaterialResearchEnabled: true },
  defaultAppSettings(),
);
assert("merge P6 levers", merged.ikMaterialE2eEnabled === "ON" && merged.ikMaterialResearchEnabled === true);
assert("merge does not flip Labor", merged.ikLaborE2eEnabled === "AUTO");
assert("merge does not flip D", merged.expertAiDecydentEnabled === false);
assert("merge does not flip Chief", merged.ikChiefWiringEnabled === false);

assert("changelog 2.66.83", /2\.66\.83/.test(readSrc("src/app/changelog-data.ts")));

const df = readSrc("docs/architecture/IK-MIGRATION-01-P6-PLAN-DESIGN-FREEZE.md");
assert("P PARSER_EMPTY", /PARSER_EMPTY/.test(df));
assert("Q SOURCE_NO_MATCH", /SOURCE_NO_MATCH/.test(df));
assert("R QUERY_TOO_NARROW", /QUERY_TOO_NARROW/.test(df));
assert("S CATEGORY_IDENTITY_MISMATCH", /CATEGORY_IDENTITY_MISMATCH/.test(df));
assert("U circuit breaker", /circuit breaker|MMR_02_CIRCUIT/i.test(df));
assert("budget MMR-02", /MMR_02/.test(df));
assert("no Labor matcher reuse", /DO_NOT_REUSE|NOT.*P5\.26-E|Labor P5\.26-E matcher/i.test(df));

assert("budget wrap wired", /IkP6MaterialBudget/.test(matSrc));

const suites = [
  ["AG P5", "scripts/test-ik-migration-01-p5-implementation.mjs"],
  ["AH P4", "scripts/test-ik-migration-01-p4-implementation.mjs"],
  ["AI P3", "scripts/test-ik-migration-01-p3-implementation.mjs"],
  ["AJ P2", "scripts/test-ik-migration-01-p2-implementation.mjs"],
  ["legacy material expert", "scripts/test-ik-migration-01-p5-material-expert.mjs"],
  ["MMR-01", "scripts/test-market-material-research-01.mjs"],
  ["MMR-02", "scripts/test-market-material-research-02.mjs"],
];

for (const [label, rel] of suites) {
  if (!existsSync(join(root, rel))) {
    assert(label + " present", false, rel);
    continue;
  }
  const r = runSuite(rel);
  assert(label + " regression", r.ok, r.out);
}

forceIkEntryEnabledForTests(null);
forceIkMaterialE2eForTests(null);
forceIkMaterialResearchForTests(null);

console.log(`\nP6 IMPLEMENTATION: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
