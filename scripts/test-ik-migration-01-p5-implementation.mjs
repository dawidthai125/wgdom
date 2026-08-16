/**
 * IK-MIGRATION-01 P5 IMPLEMENTATION — Labor E2E under IK.
 * Run: npx vite-node scripts/test-ik-migration-01-p5-implementation.mjs
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
  forceIkLaborE2eForTests,
  forceIkLaborResearchForTests,
  forceIkChiefWiringForTests,
  isIkP5LaborE2eActive,
  isIkP5LaborExecuteResearchActive,
  resolveIkP5LaborExecuteResearch,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import {
  IK_P5_MAX_HTTP_PER_RUN,
  IK_P5_MAX_HTTP_PER_WORK,
  IkP5ResearchBudget,
} from "../src/lib/intelligent-estimator/ik-p5-labor-budget.ts";

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
  const r = spawnSync(process.execPath, ["--import", "tsx", join(root, rel)], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  // vite-node preferred
  const r2 = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite-node", rel],
    { cwd: root, encoding: "utf8", shell: true },
  );
  const out = (r2.stdout || "") + (r2.stderr || "");
  const ok = r2.status === 0 && /PASS|0 FAIL|PASS \/ 0 FAIL/i.test(out);
  return { ok, out: out.slice(-400) };
}

// --- Defaults / levers ---
forceIkEntryEnabledForTests(null);
forceIkLaborE2eForTests(null);
forceIkLaborResearchForTests(null);
forceIkChiefWiringForTests(null);

const d = defaultAppSettings();
assert("A P5 OFF defaults", d.ikLaborE2eEnabled === false && d.ikLaborResearchEnabled === false);
assert("A2 P5 inactive", isIkP5LaborE2eActive() === false);
assert("A3 research inactive", isIkP5LaborExecuteResearchActive() === false);

forceIkEntryEnabledForTests(true);
forceIkLaborE2eForTests(true);
forceIkLaborResearchForTests(false);
assert("B MODE A flags", isIkP5LaborE2eActive() === true && isIkP5LaborExecuteResearchActive() === false);
assert(
  "B executeResearch resolve false",
  resolveIkP5LaborExecuteResearch({
    ikEntryEnabled: true,
    ikLaborE2eEnabled: true,
    ikLaborResearchEnabled: false,
  }) === false,
);

forceIkLaborResearchForTests(true);
assert("C MODE B research ON", isIkP5LaborExecuteResearchActive() === true);
assert(
  "C resolve true only all three",
  resolveIkP5LaborExecuteResearch({
    ikEntryEnabled: true,
    ikLaborE2eEnabled: true,
    ikLaborResearchEnabled: true,
  }) === true,
);
assert(
  "C missing research false",
  resolveIkP5LaborExecuteResearch({
    ikEntryEnabled: true,
    ikLaborE2eEnabled: true,
    ikLaborResearchEnabled: false,
  }) === false,
);

forceIkLaborE2eForTests(null);
forceIkLaborResearchForTests(null);
forceIkEntryEnabledForTests(null);

// --- executeResearch hardening in source ---
const laborSrc = readSrc("src/lib/intelligent-estimator/ik-labor-expert.ts");
assert("M executeResearch === true (not !== false)", /executeResearch === true/.test(laborSrc));
assert("M no default true via !== false", !/executeResearch !== false/.test(laborSrc));

const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
assert("N host passes executeResearch: p5ResearchOn === true", /executeResearch:\s*p5ResearchOn === true/.test(hostSrc));
assert("N Material stays RUN_RATE_EXPERTS false", /IK_ENTRY_SHELL_RUN_RATE_EXPERTS = false/.test(hostSrc));
assert("N Labor uses p5LaborOn", /isIkP5LaborE2eActive/.test(hostSrc));

assert("O budget run=24", IK_P5_MAX_HTTP_PER_RUN === 24);
assert("P budget work=4", IK_P5_MAX_HTTP_PER_WORK === 4);

const budget = new IkP5ResearchBudget();
for (let i = 0; i < 4; i++) budget.record("w1|szt", 1);
assert("P work ceiling blocks 5th", budget.canFetch("w1|szt", 1) === false);
const budget2 = new IkP5ResearchBudget();
for (let i = 0; i < 24; i++) budget2.record(`w${i}|szt`, 1);
assert("O run ceiling blocks 25th", budget2.canFetch("w99|szt", 1) === false);
assert("Q blind retry policy 0 in DF docs", /No blind retry|Blind retry on same URL/i.test(readSrc("docs/architecture/IK-MIGRATION-01-P5-PLAN-DESIGN-FREEZE.md")));

assert("R category keys flooring present", /flooring/.test(readSrc("src/lib/work-catalog/work-rate-discovery-allowlist.ts")));
assert("S no P5.33 invent", !existsSync(join(root, "docs/architecture/IK-MIGRATION-01-P5.33-IMPLEMENTATION.md")));

assert("internal-first wired", /lookupInternalFirst/.test(laborSrc));
assert("budget wrap wired", /wrapLookupPortWithIkP5Budget/.test(laborSrc));
assert("Admin toggles", /data-ik-labor-e2e-toggle/.test(readSrc("src/app/AdminSettingsModal.tsx"))
  && /data-ik-labor-research-toggle/.test(readSrc("src/app/AdminSettingsModal.tsx")));

const merged = mergeAppSettings(
  { ikLaborE2eEnabled: true, ikLaborResearchEnabled: true },
  defaultAppSettings(),
);
assert("merge P5 levers", merged.ikLaborE2eEnabled === true && merged.ikLaborResearchEnabled === true);
assert("merge does not flip D", merged.expertAiDecydentEnabled === false);
assert("merge does not flip Chief", merged.ikChiefWiringEnabled === false);

assert("AC Accept still Owner-only in labor expert", /autoAcceptExecuted = false/.test(laborSrc));
assert("no auto CatalogWrite invent", !/acceptIkLaborResearchAndNotify\(/.test(laborSrc));

assert("P5.26 lock in DF", /CatalogWork \*\*471\*\*/.test(readSrc("docs/architecture/IK-MIGRATION-01-P5-PLAN-DESIGN-FREEZE.md")));
assert("changelog 2.66.82", /2\.66\.82/.test(readSrc("src/app/changelog-data.ts")));

// Semantic status markers present
assert("internal statuses", /INTERNAL_EXACT_HIT/.test(laborSrc) && /INTERNAL_REVIEW/.test(laborSrc));

// Parser empty / failure semantics docs
const df = readSrc("docs/architecture/IK-MIGRATION-01-P5-PLAN-DESIGN-FREEZE.md");
assert("T PARSER_EMPTY rule", /PARSER_EMPTY/.test(df));
assert("U SOURCE_NO_MATCH rule", /SOURCE_NO_MATCH/.test(df));
assert("V QUERY_TOO_NARROW", /QUERY_TOO_NARROW/.test(df));
assert("W identity mismatch", /CATEGORY_IDENTITY_MISMATCH/.test(df));
assert("X circuit breaker", /circuit breaker|SOURCE_EMPTY/i.test(df));

// Regression child suites (reuse)
const suites = [
  ["AJ P4", "scripts/test-ik-migration-01-p4-implementation.mjs"],
  ["AK P3", "scripts/test-ik-migration-01-p3-implementation.mjs"],
  ["AL P2", "scripts/test-ik-migration-01-p2-implementation.mjs"],
  ["AI P5.26E", "scripts/test-ik-migration-01-p526e-matcher-safety.mjs"],
  ["P5.27", "scripts/test-ik-migration-01-p527-fix-existing-category-reuse.mjs"],
  ["P5.31", "scripts/test-ik-migration-01-p531-category-key-create-route.mjs"],
  ["P5.32", "scripts/test-ik-migration-01-p532-fix-edge-category-route-parity.mjs"],
  ["legacy labor", "scripts/test-ik-migration-01-p4-labor-expert.mjs"],
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
forceIkLaborE2eForTests(null);
forceIkLaborResearchForTests(null);

console.log(`\nP5 IMPLEMENTATION: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
