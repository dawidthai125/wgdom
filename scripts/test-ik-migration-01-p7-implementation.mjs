/**
 * IK-MIGRATION-01 P7 IMPLEMENTATION — Position Cost → F5 → Bid → SUM → EC.
 * Run: npx vite-node scripts/test-ik-migration-01-p7-implementation.mjs
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
  forceIkF5E2eForTests,
  forceIkMaterialE2eForTests,
  forceIkLaborE2eForTests,
  forceIkChiefWiringForTests,
  isIkP7F5E2eActive,
  resolveIkP7F5E2eActive,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import {
  runIkP7PositionCostBid,
  IK_P7_POSITION_COST_BID_SCHEMA_VERSION,
} from "../src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts";
import { evaluatePackageGate } from "../src/lib/multi-dwelling/package-gate.ts";
import { evaluateBidCutoverGate } from "../src/lib/tender-position-cost/bid-position-cost-cutover.ts";

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
  return { ok, out: out.slice(-800) };
}

forceIkEntryEnabledForTests(null);
forceIkF5E2eForTests(null);
forceIkMaterialE2eForTests(null);
forceIkLaborE2eForTests(null);
forceIkChiefWiringForTests(null);

// A — P7 OFF
const d = defaultAppSettings();
assert("A P7 OFF default", d.ikF5E2eEnabled === false);
assert("A2 P7 inactive", isIkP7F5E2eActive() === false);
assert(
  "A3 resolve false without entry",
  resolveIkP7F5E2eActive({ ikEntryEnabled: false, ikF5E2eEnabled: true }) === false,
);

// B — P7 ON flags
forceIkEntryEnabledForTests(true);
forceIkF5E2eForTests(true);
assert("B P7 ON", isIkP7F5E2eActive() === true);
assert(
  "B resolve true",
  resolveIkP7F5E2eActive({ ikEntryEnabled: true, ikF5E2eEnabled: true }) === true,
);
forceIkF5E2eForTests(null);
forceIkEntryEnabledForTests(null);

// C / D / E / F — seam source + missing BOQ → GAP (no invent 0 bid)
const gapReport = runIkP7PositionCostBid({
  item: /** @type {any} */ ({
    id: "p7-test-tender",
    tenderId: "p7-test-tender",
    title: "P7 test",
  }),
  expert: /** @type {any} */ ({
    tenderId: "p7-test-tender",
    status: "gap",
    reasons: [],
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: { extractedCount: 0 },
    masterBoq: {
      status: "gap",
      readyForExperts: false,
      lineCount: 0,
    },
    offerBoq: null,
    masterBoqLines: [],
  }),
});
assert("C handoff schema", gapReport.schemaVersion === IK_P7_POSITION_COST_BID_SCHEMA_VERSION);
assert("F missing BOQ → gap status", gapReport.status === "gap");
assert("F recommendedBid null", gapReport.recommendedBidPln == null);
assert("F bidOk false", gapReport.bidOk === false);
assert("T researchExecuted false", gapReport.researchExecuted === false);
assert("U httpCalls 0", gapReport.httpCalls === 0);
assert("V catalogWorkWrite false", gapReport.catalogWorkWrite === false);
assert("W priceMemoryWrite false", gapReport.priceMemoryWrite === false);
assert("S provenance rate GAP", gapReport.provenance.rateSources.includes("GAP"));

// Host / seam wiring
const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const p7Src = readSrc("src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
const convSrc = readSrc("src/lib/intelligent-estimator/ik-entry-conversation.ts");

assert("B host p7 marker", /data-ik-p7-f5-e2e/.test(hostSrc));
assert("B host isIkP7F5E2eActive", /isIkP7F5E2eActive/.test(hostSrc));
assert("B host runIkP7PositionCostBid", /runIkP7PositionCostBid/.test(hostSrc));
assert("T host no labor research for P7", !/runIkMasterBoqLaborExpert[\s\S]{0,200}p7F5On/.test(hostSrc));
assert("I REUSE computeBidProposalFromPositionCost", /computeBidProposalFromPositionCost/.test(p7Src));
assert("P REUSE cutover", /bid-position-cost-cutover/.test(p7Src));
assert("Q REUSE computePackageBidProposal|computeTenderBidProposal", /computePackageBidProposal|computeTenderBidProposal/.test(p7Src));
assert("M REUSE aggregatePackageDirect", /aggregatePackageDirect/.test(p7Src));
assert("N REUSE evaluatePackageGate", /evaluatePackageGate/.test(p7Src));
assert("ensureOwnerQuestions false", /ensureOwnerQuestions:\s*false/.test(p7Src));
assert("no executeResearch in P7", !/executeResearch/.test(p7Src));
assert("no mmr/diy in P7", !/mmr-|diy|fetch\(/i.test(p7Src));
assert("R EC POSITION_COST_F5", /POSITION_COST_F5/.test(convSrc));
assert("R EC BID_PROPOSAL", /BID_PROPOSAL/.test(convSrc));
assert("R EC PACKAGE_SUM", /PACKAGE_SUM/.test(convSrc));
assert("lever ikF5E2eEnabled", /ikF5E2eEnabled/.test(flagSrc));
assert("no second Bid lever", !/ikBidE2eEnabled/.test(flagSrc) && !/ikBidEnabled/.test(readSrc("src/lib/app-settings.ts")));

assert("Admin toggle", /data-ik-f5-e2e-toggle/.test(readSrc("src/app/AdminSettingsModal.tsx")));

const merged = mergeAppSettings(
  { ikF5E2eEnabled: true },
  defaultAppSettings(),
);
assert("merge P7 ON", merged.ikF5E2eEnabled === true);
assert("merge does not flip Material", merged.ikMaterialE2eEnabled === false);
assert("merge does not flip Labor", merged.ikLaborE2eEnabled === false);
assert("merge does not flip Chief", merged.ikChiefWiringEnabled === false);
assert("merge does not flip D", merged.expertAiDecydentEnabled === false);

assert("changelog 2.66.84", /2\.66\.84/.test(readSrc("src/app/changelog-data.ts")));
assert("DF CatalogWork 471", /CatalogWork \*\*471\*\*/.test(readSrc("docs/architecture/IK-MIGRATION-01-P7-PLAN-DESIGN-FREEZE.md")));

// PackageGate BLOCK smoke (existing semantics)
const blockedGate = evaluatePackageGate(/** @type {any} */ ({
  tenderId: "t",
  mode: "multi",
  expectedDwellingCount: 2,
  dwellings: [],
  documentToDwelling: {},
}));
assert("O PackageGate BLOCK empty", blockedGate.pass === false);

// Cutover gate on empty shadow → fail (GAP semantics)
const emptyGate = evaluateBidCutoverGate(/** @type {any} */ ({
  lines: [],
  aggregates: {
    laborCostPln: 0,
    materialCostPln: 0,
    equipmentCostPln: 0,
    transportCostPln: 0,
  },
}));
assert("P empty cutover fail or zero billable", emptyGate.pass === false || emptyGate.billableLineCount === 0);

const suites = [
  // P6 suite already nests P5→P4→P3→P2 + MMR (avoid exponential re-nest)
  ["X-AB P6 chain (P5/P4/P3/P2)", "scripts/test-ik-migration-01-p6-implementation.mjs"],
];

// Prefer lightweight existing F5/PackageGate if present
const optional = [
  ["F5 cutover", "scripts/test-tender-boq-pricing-rebuild-f5.mjs"],
  ["PackageGate", "scripts/test-multi-dwelling-package-gate.mjs"],
  ["multi-dwelling", "scripts/test-multi-dwelling-01.mjs"],
  ["Y P5 labor e2e core", "scripts/test-ik-migration-01-p5-labor-e2e.mjs"],
];

for (const [label, rel] of optional) {
  if (!existsSync(join(root, rel))) continue;
  const r = runSuite(rel);
  assert(label + " reuse", r.ok, r.out);
}

for (const [label, rel] of suites) {
  if (!existsSync(join(root, rel))) {
    assert(label + " present", false, rel);
    continue;
  }
  const r = runSuite(rel);
  assert(label + " regression", r.ok, r.out);
}

forceIkEntryEnabledForTests(null);
forceIkF5E2eForTests(null);

console.log(`\nP7 IMPLEMENTATION: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
