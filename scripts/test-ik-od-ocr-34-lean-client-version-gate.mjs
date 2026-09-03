/**
 * OD-OCR-34 — numeric APP_VERSION lean client gate.
 * npx vite-node scripts/test-ik-od-ocr-34-lean-client-version-gate.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PIPELINE_CLOUD_LEAN_MIN_APP_VERSION,
  compareAppVersion,
  isAppVersionAtLeast,
  parseAppVersionTriple,
} from "../src/lib/app-version.ts";
import { evaluatePipelineCloudLeanClientVersionAllowed } from "../src/lib/app-settings.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;

function ok(cond, label) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.error(`  FAIL ${label}`);
  }
}

const LEAN_ON = {
  pipelineCloudLeanGuardV1: true,
  pipelineCloudLeanMigrationComplete: true,
  pipelineCloudLeanRollback: false,
};

function allowed(version, policy = LEAN_ON) {
  return evaluatePipelineCloudLeanClientVersionAllowed(version, policy);
}

console.log("OD-OCR-34 lean client version gate");

ok(PIPELINE_CLOUD_LEAN_MIN_APP_VERSION === "2.66.145", "floor constant is 2.66.145");

// A — policy
ok(allowed("2.66.144", { ...LEAN_ON, pipelineCloudLeanGuardV1: false }) === true, "A lean not required → allow");
ok(
  allowed("2.66.144", { ...LEAN_ON, pipelineCloudLeanMigrationComplete: false }) === true,
  "A migration incomplete → allow",
);
ok(
  allowed("2.66.144", { ...LEAN_ON, pipelineCloudLeanRollback: true }) === true,
  "A rollback → allow path",
);

// B — valid capable
ok(allowed("2.66.145") === true, "B 2.66.145 → allow");
ok(allowed("2.66.146") === true, "B 2.66.146 → allow");
ok(allowed("3.0.0") === true, "B 3.0.0 → allow");

// C — old
ok(allowed("2.66.144") === false, "C 2.66.144 → deny");
ok(allowed("2.66.143") === false, "C 2.66.143 → deny");
ok(allowed("2.65.999") === false, "C 2.65.999 → deny");
ok(allowed("2.9.99") === false, "C 2.9.99 → deny");

// D — numeric (not lexical)
ok(compareAppVersion("2.66.10", "2.66.9") > 0, "D 2.66.10 > 2.66.9");
ok(compareAppVersion("2.10.0", "2.9.99") > 0, "D 2.10.0 > 2.9.99");
ok(compareAppVersion("3.0.0", "2.99.99") > 0, "D 3.0.0 > 2.99.99");
ok(isAppVersionAtLeast("2.66.10", "2.66.9") === true, "D isAppVersionAtLeast 2.66.10 ≥ 2.66.9");
ok("2.66.9".localeCompare("2.66.10") > 0, "D localeCompare would invert 2.66.9 vs 2.66.10");
ok(isAppVersionAtLeast("2.66.9", "2.66.10") === false, "D numeric does not invert 2.66.9 vs 2.66.10");

// E — invalid fail-closed
ok(allowed("0.0.0") === false, "E 0.0.0 → deny");
ok(allowed("") === false, "E empty → deny");
ok(allowed(undefined) === false, "E undefined → deny");
ok(allowed(null) === false, "E null → deny");
ok(allowed("garbage") === false, "E garbage → deny");
ok(allowed("2.66") === false, "E incomplete → deny");
ok(allowed("2.66.145-beta") === false, "E malformed → deny");
ok(allowed("  ") === false, "E whitespace → deny");
ok(parseAppVersionTriple("2.66") === null, "E parse incomplete → null");
ok(isAppVersionAtLeast("0.0.0", "0.0.0") === false, "E 0.0.0 never at-least");

// F — SHA independence (source + API)
const settingsSrc = readFileSync(join(ROOT, "src/lib/app-settings.ts"), "utf8");
const gateFn = settingsSrc.slice(
  settingsSrc.indexOf("export function evaluatePipelineCloudLeanClientVersionAllowed"),
  settingsSrc.indexOf("export function isPipelineCloudLeanClientVersionAllowed"),
);
const publicGate = settingsSrc.slice(
  settingsSrc.indexOf("export function isPipelineCloudLeanClientVersionAllowed"),
  settingsSrc.indexOf("export function mergePipelineBootstrapPersistLocal"),
);
ok(!gateFn.includes("APP_COMMIT"), "F evaluate does not mention APP_COMMIT");
ok(!publicGate.includes("APP_COMMIT"), "F public gate does not mention APP_COMMIT");
ok(!gateFn.includes("localeCompare"), "F evaluate has no localeCompare");
ok(!publicGate.includes("localeCompare"), "F public gate has no localeCompare");
ok(!settingsSrc.includes("APP_COMMIT.localeCompare"), "F no APP_COMMIT.localeCompare in app-settings");

// G — minCommit independence
const withMinA = allowed("2.66.145", { ...LEAN_ON });
const withMinB = allowed("2.66.145", {
  ...LEAN_ON,
  pipelineCloudLeanMinCommit: "50c78e90",
});
const withMinC = allowed("2.66.145", {
  ...LEAN_ON,
  pipelineCloudLeanMinCommit: "zzzzzzzz",
});
const denyWithMin = allowed("2.66.144", {
  ...LEAN_ON,
  pipelineCloudLeanMinCommit: "00000000",
});
ok(withMinA === true && withMinB === true && withMinC === true, "G minCommit cannot deny 2.66.145");
ok(denyWithMin === false, "G minCommit cannot allow 2.66.144");
ok(!gateFn.includes("pipelineCloudLeanMinCommit"), "G evaluate does not read minCommit");
ok(!publicGate.includes("pipelineCloudLeanMinCommit"), "G public gate does not read minCommit");

// H — production bug-fix case
ok(
  allowed("2.66.145") === true,
  "H prod 2.66.145 / commit 437e5797 / minCommit 50c78e90 → ALLOW",
);
ok(allowed("2.66.144") === false, "H 2.66.144 arbitrary SHA/minCommit → DENY");

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
