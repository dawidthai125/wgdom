/**
 * IK AUTONOMY-08 P1 — Settings Unification (UI-only).
 * Run: npx vite-node scripts/test-ik-autonomy-08-p1-settings-unification.mjs
 *
 * ZERO production KV write · ZERO Research HTTP · ZERO settings write.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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

function count(src, re) {
  return (src.match(re) || []).length;
}

function gitDiffEmpty(rel) {
  const r = spawnSync("git", ["diff", "--", rel], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  return (r.stdout || "").trim() === "";
}

const adminSrc = readSrc("src/app/AdminSettingsModal.tsx");
const settingsSrc = readSrc("src/lib/app-settings.ts");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");

const technicalIdx = adminSrc.indexOf("TECHNICAL / ADVANCED / EMERGENCY");
const entryIdx = adminSrc.indexOf("data-ik-entry-toggle");
const dIdx = adminSrc.indexOf("data-expert-ai-decydent-toggle");
const p3Idx = adminSrc.indexOf("data-ik-identity-coverage-toggle");
const p4Idx = adminSrc.indexOf("data-ik-chief-wiring-toggle");
const p5Idx = adminSrc.indexOf("data-ik-labor-e2e-toggle");
const p5rIdx = adminSrc.indexOf("data-ik-labor-research-toggle");
const p6Idx = adminSrc.indexOf("data-ik-material-e2e-toggle");
const p6rIdx = adminSrc.indexOf("data-ik-material-research-toggle");
const p7Idx = adminSrc.indexOf("data-ik-f5-e2e-toggle");
const p8Idx = adminSrc.indexOf("data-ik-risk-decision-e2e-toggle");

assert("T01 Technical header present", technicalIdx >= 0);
assert("T01 data-ik-technical-advanced-emergency", /data-ik-technical-advanced-emergency/.test(adminSrc));
assert("T01 data-ik-technical-panel", /data-ik-technical-panel/.test(adminSrc));

assert("T02 data-ik-entry-toggle primary (before Technical)", entryIdx >= 0 && entryIdx < technicalIdx);
assert("T02 D toggle before Technical", dIdx >= 0 && dIdx < technicalIdx);
assert("T02 D copy unchanged", /Expert AI · Przebieg i Decydent/.test(adminSrc));

assert("T03 P3 after Technical", p3Idx > technicalIdx);
assert("T03 P4 after Technical", p4Idx > technicalIdx);
assert("T03 P5 after Technical", p5Idx > technicalIdx);
assert("T03 P5 Research checkbox absent", p5rIdx < 0);
assert("T03 P6 after Technical", p6Idx > technicalIdx);
assert("T03 P6 Research checkbox absent", p6rIdx < 0);
assert("T03 P7 after Technical", p7Idx > technicalIdx);
assert("T03 P8 after Technical", p8Idx > technicalIdx);

assert("T04 AUTO_INGEST absent", !/data-ik-auto-ingest-toggle/.test(adminSrc));
assert("T04 leftover key remains in AppSettings", /ikAutoIngestEnabled/.test(settingsSrc));

assert(
  "T05 IK copy SSOT",
  /Steruje działaniem Inteligentnego Kosztorysanta w przetargach/.test(adminSrc),
);
assert("T05 old Documents/BOQ primary copy gone", !/od dokumentów i przygotowania BOQ/.test(adminSrc));
assert("T05 IK title reused", /Inteligentny Kosztorysant/.test(adminSrc));
assert("T05 ikEntryEnabled still checkbox write", /ikEntryEnabled:\s*e\.target\.checked/.test(adminSrc));

assert("T06 IC-2 hidden={!ikTechnicalOpen}", /hidden=\{!ikTechnicalOpen\}/.test(adminSrc));
assert("T06 IC-2 no unmount {ikTechnicalOpen &&", !/\{ikTechnicalOpen\s*&&/.test(adminSrc));
assert("T06 accordion default collapsed", /useState\(false\);\s*\n\s*const \[newLogin/.test(adminSrc) || /const \[ikTechnicalOpen, setIkTechnicalOpen\] = useState\(false\)/.test(adminSrc));
assert(
  "T06 accordion toggle does not save settings",
  /onClick=\{\(\) => setIkTechnicalOpen\(\(v\) => !v\)\}/.test(adminSrc)
    && !/setIkTechnicalOpen[\s\S]{0,80}saveAppSettings/.test(adminSrc),
);

const attrs = [
  "data-ik-entry-toggle",
  "data-ik-identity-coverage-toggle",
  "data-ik-chief-wiring-toggle",
  "data-ik-labor-e2e-toggle",
  "data-ik-labor-e2e-mode",
  "data-ik-material-e2e-toggle",
  "data-ik-material-e2e-mode",
  "data-ik-f5-e2e-toggle",
  "data-ik-f5-e2e-mode",
  "data-ik-risk-decision-e2e-toggle",
  "data-ik-risk-decision-e2e-mode",
];
for (const a of attrs) {
  const n = count(adminSrc, new RegExp(a, "g"));
  assert(`T07 unique ${a}`, n === 1, `count=${n}`);
}
assert("T07 labor research-toggle absent", count(adminSrc, /data-ik-labor-research-toggle/g) === 0);
assert("T07 material research-toggle absent", count(adminSrc, /data-ik-material-research-toggle/g) === 0);

assert("T08 AUTO option kept", /option value="AUTO"/.test(adminSrc));
assert("T08 ON option kept", /option value="ON"/.test(adminSrc));
assert("T08 OFF option kept", /option value="OFF"/.test(adminSrc));
assert("T08 P5 confirm kept", /IK nie uruchamia tego eksperta/.test(adminSrc));
assert("T08 P7 confirm kept", /Bid calc pozostanie wyłączony/.test(adminSrc));
assert("T08 P8 confirm kept", /przygotowania P8/.test(adminSrc));

assert("T09 no new IK flag", !/ikUnified|ikMasterAutonomous|ikP1Settings/.test(settingsSrc));
assert("T09 P2 gate still Entry only", /export function isIkP2DocumentsBoqActive\(\): boolean \{\s*return isIkEntryEnabled\(\) === true;/.test(flagSrc));
assert("T09 host still uses helper", /isIkP2DocumentsBoqActive\(\)/.test(hostSrc));

assert("T10 P2 may change gate+host (A08-P2)", true);
assert("T10 app-settings unchanged vs git", gitDiffEmpty("src/lib/app-settings.ts"));
assert("T10 admin-auth unchanged vs git", gitDiffEmpty("src/lib/admin-auth.ts"));
assert("T10 AdminTopbar unchanged vs git", gitDiffEmpty("src/app/admin/AdminTopbar.tsx"));
assert("T10 TenderDetailPage unchanged vs git", gitDiffEmpty("src/app/TenderDetailPage.tsx"));

assert("T11 no staff settings panel file", !/AdminStaffIkSettings/.test(adminSrc));
assert("T11 Technical intro present", /IK nie wymaga ręcznego włączania każdego etapu/.test(adminSrc));

console.log(`\nAUTONOMY-08 P1: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
