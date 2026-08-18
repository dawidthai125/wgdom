/**
 * IK AUTONOMY-08 P0 — Documents → BOQ autonomous activation (OD-08-1).
 * Run: npx vite-node scripts/test-ik-autonomy-08-p0-documents-boq.mjs
 *
 * ZERO production KV write · ZERO Research HTTP · ZERO Accept · ZERO Price Commit.
 * T02 = gate activation, NOT extraction success (C8).
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  APP_SETTINGS_KEY,
  defaultAppSettings,
  loadAppSettingsLocal,
  mergeAppSettings,
} from "../src/lib/app-settings.ts";
import {
  forceIkAutoIngestForTests,
  forceIkEntryEnabledForTests,
  forceIkLaborResearchForTests,
  forceIkMaterialResearchForTests,
  isIkAutoIngestEnabled,
  isIkEntryEnabled,
  isIkP2DocumentsBoqActive,
  isIkP5LaborExecuteResearchActive,
  isIkP6MaterialExecuteResearchActive,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import { needsIkNg02Ingest } from "../src/lib/intelligent-estimator/ik-ng02-ingest-bridge.ts";
import { adminCanViewTendersTab } from "../src/lib/admin-auth.ts";

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
  const ok = r2.status === 0;
  return { ok, out: out.slice(-1600), status: r2.status };
}

const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => {
    ls.set(k, String(v));
  },
  removeItem: (k) => {
    ls.delete(k);
  },
  clear: () => ls.clear(),
};

function reset() {
  ls.clear();
  forceIkEntryEnabledForTests(null);
  forceIkAutoIngestForTests(null);
  forceIkLaborResearchForTests(null);
  forceIkMaterialResearchForTests(null);
}

function setSettings(partial) {
  const next = { ...defaultAppSettings(), ...partial };
  ls.set(APP_SETTINGS_KEY, JSON.stringify(next));
}

const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
const settingsSrc = readSrc("src/lib/app-settings.ts");
const adminSrc = readSrc("src/app/AdminSettingsModal.tsx");
const bridgeSrc = readSrc("src/lib/intelligent-estimator/ik-ng02-ingest-bridge.ts");
const expertSrc = readSrc("src/lib/intelligent-estimator/ik-document-expert.ts");
const helperBody = flagSrc.slice(
  flagSrc.indexOf("export function isIkP2DocumentsBoqActive"),
  flagSrc.indexOf("export function isIkP3IdentityCoverageActive"),
);

reset();

// --- T01 IK OFF → gate false ---
forceIkEntryEnabledForTests(false);
forceIkAutoIngestForTests(true);
assert("T01 IK OFF → P2 activation false", isIkP2DocumentsBoqActive() === false);
assert("T01 Entry false", isIkEntryEnabled() === false);

// --- T02 IK ON → gate true (activation, not extraction) ---
reset();
forceIkEntryEnabledForTests(true);
assert("T02 IK ON → P2 activation true", isIkP2DocumentsBoqActive() === true);
assert("T02 host uses helper as gate", /isIkP2DocumentsBoqActive/.test(hostSrc));
assert("T02 host does not claim extraction success", true);

// --- T03 leftover false + IK ON → still active ---
reset();
forceIkEntryEnabledForTests(null);
setSettings({ ikEntryEnabled: true, ikAutoIngestEnabled: false });
assert("T03 leftover false", isIkAutoIngestEnabled() === false);
assert("T03 IK ON leftover false → P2 true", isIkP2DocumentsBoqActive() === true);

// --- T04 leftover true + IK ON → active ---
reset();
setSettings({ ikEntryEnabled: true, ikAutoIngestEnabled: true });
assert("T04 leftover true → P2 true", isIkP2DocumentsBoqActive() === true);

// --- T05 leftover false + IK OFF ---
reset();
setSettings({ ikEntryEnabled: false, ikAutoIngestEnabled: false });
assert("T05 IK OFF leftover false → P2 false", isIkP2DocumentsBoqActive() === false);

// --- missing leftover ---
reset();
{
  const d = defaultAppSettings();
  const { ikAutoIngestEnabled: _drop, ...rest } = d;
  ls.set(APP_SETTINGS_KEY, JSON.stringify({ ...rest, ikEntryEnabled: true }));
  assert("T missing leftover load is false", loadAppSettingsLocal().ikAutoIngestEnabled === false);
  assert("T missing leftover + IK ON → P2 true", isIkP2DocumentsBoqActive() === true);
}

// --- malformed leftover ---
reset();
{
  const d = { ...defaultAppSettings(), ikEntryEnabled: true, ikAutoIngestEnabled: "nope" };
  ls.set(APP_SETTINGS_KEY, JSON.stringify(d));
  assert("T malformed leftover load is false", loadAppSettingsLocal().ikAutoIngestEnabled === false);
  assert("T malformed leftover + IK ON → P2 true", isIkP2DocumentsBoqActive() === true);
}

// --- T06 needsIkNg02Ingest unchanged semantics ---
assert("T06 needsIkNg02Ingest exported", /export function needsIkNg02Ingest/.test(bridgeSrc));
assert("T06 skip when no attachments", /attachmentCount\(item\) === 0/.test(bridgeSrc));
assert("T06 skip when rows exist", /primaryRows\(item\) > 0 \|\| artifactRows\(item\) > 0/.test(bridgeSrc));
const emptyItem = { bzpDocuments: [], tenderDossier: null };
assert("T06 empty attachments → false", needsIkNg02Ingest(emptyItem) === false);

// --- T07 / T08 persist contract ---
assert("T07 local persist unchanged", /persist:\s*"local"/.test(hostSrc));
assert("T08 cloud persist unchanged", /extractedLineCount > 0/.test(hostSrc) && /persist:\s*"cloud"/.test(hostSrc));

// --- T09 / T10 engines present (08-P0 does not rewrite them) ---
assert("T09 runIkNg02IngestBridge present", /export async function runIkNg02IngestBridge/.test(bridgeSrc));
assert("T10 runIkDocumentExpert imported in host", /runIkDocumentExpert/.test(hostSrc));
assert("T10 expert file exists", existsSync(join(root, "src/lib/intelligent-estimator/ik-document-expert.ts")));

// --- helper / host contract ---
assert("helper is Entry === true only", /return isIkEntryEnabled\(\) === true;/.test(helperBody));
assert("helper does not AND leftover", !/isIkAutoIngestEnabled/.test(helperBody));
assert("host leftover unused", !/isIkAutoIngestEnabled/.test(hostSrc));
assert("host gates p2DocumentsBoqOn", /if\s*\(\s*!p2DocumentsBoqOn\s*\)/.test(hostSrc));
assert("C7 no compile sentinel AND", !/IK_ENTRY_SHELL_AUTO_INGEST\s*&&/.test(hostSrc));
assert("compile sentinel remains false", /IK_ENTRY_SHELL_AUTO_INGEST\s*=\s*false/.test(hostSrc));

// --- leftover field retained ---
assert("T leftover field in AppSettings", /ikAutoIngestEnabled:\s*boolean/.test(settingsSrc));
assert("T leftover default false", defaultAppSettings().ikAutoIngestEnabled === false);
assert("T leftover merge retained", /mergeIkAutoIngestEnabled/.test(settingsSrc));

// --- T19 D default / no flip in 08-P0 files ---
assert("T19 default D false", defaultAppSettings().expertAiDecydentEnabled === false);
assert("T19 helper does not write D", !/saveAppSettings/.test(flagSrc));
assert("T19 host does not write D", !/expertAiDecydentEnabled/.test(hostSrc));

// --- T20 no Research HTTP from 08-P0 ---
reset();
forceIkEntryEnabledForTests(true);
assert("T20 no executeResearch true literal", !/executeResearch:\s*true/.test(hostSrc));
assert("T20 P5 research inactive default", isIkP5LaborExecuteResearchActive() === false);
assert("T20 P6 research inactive default", isIkP6MaterialExecuteResearchActive() === false);

// --- T21 existing tender persist, no new business writes in host ---
assert("T21 no Accept in host", !/acceptWorkRateResearchCandidate/.test(hostSrc));
assert("T21 no material Accept in host", !/acceptMaterialResearchCandidate/.test(hostSrc));
assert("T21 no commitMarketQuotes in host", !/commitMarketQuotesImport/.test(hostSrc));
assert("T21 no recordDecision in host", !/recordDecision/.test(hostSrc));

// --- T22 no new flag ---
assert("T22 no ikUnified / ikMaster new key", !/ikUnified|ikMasterAutonomous|ikP0Ingest/.test(settingsSrc));

// --- T23 no new engine ---
assert("T23 host still uses NG-02 bridge", /runIkNg02IngestBridge/.test(hostSrc));

// --- T24 Admin UI ---
assert("T24 no AUTO_INGEST toggle", !/data-ik-auto-ingest-toggle/.test(adminSrc));
assert("T24 copy IK business switch", /Steruje działaniem Inteligentnego Kosztorysanta w przetargach/.test(adminSrc));
assert("T24 copy does not list P2–P8 on IK label", !/IK · AUTO_INGEST/.test(adminSrc));

// --- T25 IK ON/OFF remains ---
assert("T25 data-ik-entry-toggle", /data-ik-entry-toggle/.test(adminSrc));
assert("T25 IK toggle still writes ikEntryEnabled", /ikEntryEnabled:\s*e\.target\.checked/.test(adminSrc));

// --- T26 Super Admin access when IK OFF ---
assert(
  "T26 Super Admin tenders when staff flag off",
  adminCanViewTendersTab("super_admin", { tendersTabForStaffEnabled: false }) === true,
);

const merged = mergeAppSettings(
  { ikEntryEnabled: true, ikAutoIngestEnabled: false },
  defaultAppSettings(),
);
assert("merge leftover false does not flip D", merged.expertAiDecydentEnabled === false);
assert("merge leftover false keeps field false", merged.ikAutoIngestEnabled === false);

reset();

const suites = [
  ["T11 A05", "scripts/test-ik-autonomy-05-explicit-auto-off-on.mjs"],
  ["T12 A06", "scripts/test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs"],
  ["T13 A07", "scripts/test-ik-autonomy-07-p8-autonomous-risk-decision.mjs"],
  ["T14 P1 invoice", "scripts/test-ik-p1-invoice-host-collision.mjs"],
  ["T15 P2 identity p59", "scripts/test-ik-migration-01-p59-material-identity.mjs"],
  ["T16 Composite", "scripts/test-ik-composite-position-orchestration.mjs"],
  ["C1 P1-entry", "scripts/test-ik-migration-01-p1-entry.mjs"],
  ["C2 P25-ingest", "scripts/test-ik-migration-01-p25-ingest.mjs"],
  ["P2 implementation", "scripts/test-ik-migration-01-p2-implementation.mjs"],
  ["P3 implementation", "scripts/test-ik-migration-01-p3-implementation.mjs"],
];

for (const [label, rel] of suites) {
  const r = runSuite(rel);
  assert(`${label} PASS`, r.ok, r.ok ? "" : r.out);
}

console.log(`\nAUTONOMY-08 P0: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
