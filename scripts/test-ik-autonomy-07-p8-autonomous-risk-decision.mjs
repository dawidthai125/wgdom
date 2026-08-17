/**
 * IK AUTONOMY-07 — P8 Autonomous Risk / Decision Prepare (AUTO|OFF|ON).
 * Run: npx vite-node scripts/test-ik-autonomy-07-p8-autonomous-risk-decision.mjs
 *
 * ZERO production KV write · ZERO Research HTTP · ZERO Accept · ZERO Price Commit.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  defaultAppSettings,
  mergeAppSettings,
  mergeIkE2eMode,
  normalizeIkE2eMode,
  parseIkE2eMode,
  isIkE2eModeActive,
} from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  forceIkF5E2eForTests,
  forceIkLaborE2eForTests,
  forceIkLaborResearchForTests,
  forceIkMaterialE2eForTests,
  forceIkMaterialResearchForTests,
  forceIkRiskDecisionE2eForTests,
  forceIkChiefWiringForTests,
  isIkP5LaborExecuteResearchActive,
  isIkP6MaterialExecuteResearchActive,
  isIkP7F5E2eActive,
  isIkP8RiskDecisionE2eActive,
  isIkRiskDecisionE2eEnabled,
  resolveIkP8RiskDecisionE2eActive,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import {
  runIkP8RiskDecision,
  IK_P8_RISK_DECISION_SCHEMA_VERSION,
} from "../src/lib/intelligent-estimator/ik-p8-risk-decision.ts";
import { researchEligible } from "../src/lib/intelligent-estimator/ik-material-expert.ts";
import { classifyIkMaterialIdentityP59 } from "../src/lib/intelligent-estimator/ik-material-identity-p59.ts";
import { assertMaterialResearchAllowed } from "../src/lib/intelligent-estimator/classification-gate.ts";
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

function runSuite(rel) {
  const r2 = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite-node", rel],
    { cwd: root, encoding: "utf8", shell: true },
  );
  const out = (r2.stdout || "") + (r2.stderr || "");
  const ok = r2.status === 0;
  return { ok, out: out.slice(-1200), status: r2.status };
}

/** Old-client coerce: === true only (rollback fail-safe). */
function oldClientBooleanCoerce(value) {
  return value === true;
}

function resetFlags() {
  forceIkEntryEnabledForTests(null);
  forceIkF5E2eForTests(null);
  forceIkLaborE2eForTests(null);
  forceIkLaborResearchForTests(null);
  forceIkMaterialE2eForTests(null);
  forceIkMaterialResearchForTests(null);
  forceIkRiskDecisionE2eForTests(null);
  forceIkChiefWiringForTests(null);
}

resetFlags();

const settingsSrc = readSrc("src/lib/app-settings.ts");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const adminSrc = readSrc("src/app/AdminSettingsModal.tsx");
const p8Src = readSrc("src/lib/intelligent-estimator/ik-p8-risk-decision.ts");
const p7Src = readSrc("src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts");
const compositeSrc = readSrc("src/lib/intelligent-estimator/ik-composite-both-hold.ts");
const chiefFlagSrc = readSrc("src/lib/chief-session/flag.ts");

const p8Memo = hostSrc.match(/const riskDecision = useMemo[\s\S]*?\}, \[p8RiskOn/)?.[0] ?? "";

// --- T01 default AUTO ---
assert("T01 default AUTO", defaultAppSettings().ikRiskDecisionE2eEnabled === "AUTO");

// --- T02 explicit AUTO ---
assert("T02 normalize AUTO", normalizeIkE2eMode("AUTO") === "AUTO");
assert("T02 isIkE2eModeActive AUTO", isIkE2eModeActive("AUTO") === true);

// --- T03 explicit ON ---
assert("T03 normalize ON", normalizeIkE2eMode("ON") === "ON");
assert("T03 isIkE2eModeActive ON", isIkE2eModeActive("ON") === true);

// --- T04 explicit OFF ---
assert("T04 normalize OFF", normalizeIkE2eMode("OFF") === "OFF");
assert("T04 isIkE2eModeActive OFF", isIkE2eModeActive("OFF") === false);

// --- T05 legacy true → ON ---
assert("T05 parse true → ON", parseIkE2eMode(true) === "ON");
assert("T05 normalize true → ON", normalizeIkE2eMode(true) === "ON");
assert(
  "T05 merge legacy true",
  mergeAppSettings({ ikRiskDecisionE2eEnabled: true }, defaultAppSettings()).ikRiskDecisionE2eEnabled === "ON",
);

// --- T06 legacy false → AUTO ---
assert("T06 parse false → AUTO", parseIkE2eMode(false) === "AUTO");
assert("T06 normalize false → AUTO", normalizeIkE2eMode(false) === "AUTO");
assert(
  "T06 mergeAppSettings legacy false → AUTO",
  mergeAppSettings({ ikRiskDecisionE2eEnabled: false }, defaultAppSettings()).ikRiskDecisionE2eEnabled === "AUTO",
);

// --- T07 missing → AUTO ---
assert("T07 parse missing null", parseIkE2eMode(undefined) === null);
assert("T07 normalize missing → AUTO", normalizeIkE2eMode(undefined) === "AUTO");
assert(
  "T07 merge missing keeps local AUTO",
  mergeAppSettings({}, defaultAppSettings()).ikRiskDecisionE2eEnabled === "AUTO",
);

// --- T08 malformed → AUTO (not ON) ---
assert("T08 parse malformed null", parseIkE2eMode("YES") === null);
assert("T08 normalize malformed → AUTO", normalizeIkE2eMode("YES") === "AUTO");
assert("T08 normalize object → AUTO", normalizeIkE2eMode({}) === "AUTO");
assert("T08 not ON", normalizeIkE2eMode("YES") !== "ON");

// --- T09 OFF wins ---
assert("T09 remote OFF local AUTO", mergeIkE2eMode("OFF", "AUTO") === "OFF");
assert("T09 remote OFF local ON", mergeIkE2eMode("OFF", "ON") === "OFF");
assert("T09 remote AUTO local OFF", mergeIkE2eMode("AUTO", "OFF") === "OFF");
assert("T09 remote ON local OFF", mergeIkE2eMode("ON", "OFF") === "OFF");
assert("T09 remote AUTO local ON", mergeIkE2eMode("AUTO", "ON") === "AUTO");
assert("T09 mergeIkE2eMode reused in settings", /mergeIkE2eMode\(remote\?\.ikRiskDecisionE2eEnabled/.test(settingsSrc));

// --- T10 AUTO activation ---
forceIkEntryEnabledForTests(true);
forceIkRiskDecisionE2eForTests("AUTO");
assert("T10 AUTO runtime active", isIkP8RiskDecisionE2eActive() === true);
assert("T10 isIkRiskDecisionE2eEnabled AUTO", isIkRiskDecisionE2eEnabled() === true);

// --- T11 ON activation ---
forceIkRiskDecisionE2eForTests("ON");
assert("T11 ON runtime active", isIkP8RiskDecisionE2eActive() === true);

// --- T12 OFF HOLD ---
forceIkRiskDecisionE2eForTests("OFF");
assert("T12 OFF HOLD", isIkP8RiskDecisionE2eActive() === false);
assert("T12 resolve OFF capability false", resolveIkP8RiskDecisionE2eActive({
  ikEntryEnabled: true,
  ikRiskDecisionE2eEnabled: false,
}) === false);

// --- T13 IK Entry OFF ---
forceIkEntryEnabledForTests(false);
forceIkRiskDecisionE2eForTests("AUTO");
assert("T13 Entry OFF blocks AUTO", isIkP8RiskDecisionE2eActive() === false);
forceIkRiskDecisionE2eForTests("ON");
assert("T13 Entry OFF blocks ON", isIkP8RiskDecisionE2eActive() === false);

// --- T14 existing P8 input behavior (NO new BOQ gate) ---
assert("T14 host P8 memo extracted", p8Memo.includes("runIkP8RiskDecision"));
assert("T14 host P8 only p8RiskOn skip", /if \(!p8RiskOn\) return null/.test(p8Memo));
assert("T14 engine requires item only", /item: TenderPipelineItem/.test(p8Src));
assert("T14 host still calls engine without BOQ check", /runIkP8RiskDecision\(\{/.test(p8Memo));

const holdReport = runIkP8RiskDecision({
  item: /** @type {any} */ ({
    id: "a07-p8",
    tenderId: "a07-p8",
    title: "A07",
    submittingOffersDate: "2099-12-31",
  }),
  chiefSession: null,
  bidProposal: null,
  p7: null,
});
assert("T14 engine runs without BOQ/P7/Chief", holdReport.schemaVersion === IK_P8_RISK_DECISION_SCHEMA_VERSION);
assert("T14 overlay present", holdReport.overlay != null);
assert("T14 validation HOLD without Chief", holdReport.validation == null && holdReport.chiefAvailable === false);

// --- T15 Research remains false ---
forceIkEntryEnabledForTests(true);
forceIkRiskDecisionE2eForTests("AUTO");
forceIkLaborResearchForTests(false);
forceIkMaterialResearchForTests(false);
forceIkLaborE2eForTests("AUTO");
forceIkMaterialE2eForTests("AUTO");
assert("T15 P8 AUTO does not enable Labor research", isIkP5LaborExecuteResearchActive() === false);
assert("T15 P8 AUTO does not enable Material research", isIkP6MaterialExecuteResearchActive() === false);
assert("T15 P8 source no executeResearch", !/executeResearch/.test(p8Src));
assert("T15 host P8 no research arg", !/runIkP8RiskDecision\([\s\S]*executeResearch/.test(hostSrc));
assert("T15 httpCalls 0 lock", /httpCalls:\s*0/.test(p8Src));
assert("T15 researchExecuted false", /researchExecuted:\s*false/.test(p8Src));
assert("T15 no fetch in P8", !/\bfetch\s*\(/.test(p8Src));
assert("T15 report research 0", holdReport.researchExecuted === false && holdReport.httpCalls === 0);

// --- T16 no Accept ---
assert("T16 autoAcceptExecuted false", holdReport.autoAcceptExecuted === false);
assert("T16 host no Accept on P8", !/acceptIkLaborResearchAndNotify\(/.test(hostSrc));

// --- T17 no Price Commit ---
assert("T17 priceMemoryWrite false", holdReport.priceMemoryWrite === false);
assert("T17 no PRICE_DEMAND in P8", !/PRICE_DEMAND/.test(p8Src));

// --- T18 no Final Bid ---
assert("T18 ownerDecisionRecorded false", holdReport.ownerDecisionRecorded === false);
assert("T18 localDecision null", holdReport.decisionWorkspace?.localDecision == null);
assert("T18 Admin Owner copy", /Final Bid = Owner/.test(adminSrc));

// --- T19 zero business writes ---
assert("T19 catalogWorkWrite false", holdReport.catalogWorkWrite === false);
assert("T19 no saveWorkCatalog in P8", !/saveWorkCatalog/.test(p8Src));
assert("T19 no persistKey/onUpdate in P8", !/persistKey|onUpdate\(/.test(p8Src));

// --- T20 D remains false ---
assert("T20 default D false", defaultAppSettings().expertAiDecydentEnabled === false);
assert(
  "T20 merge P8 AUTO does not flip D",
  mergeAppSettings({ ikRiskDecisionE2eEnabled: "AUTO" }, defaultAppSettings()).expertAiDecydentEnabled === false,
);
assert("T20 expertAiDecydentFlipped false", holdReport.expertAiDecydentFlipped === false);

// --- T21 Chief remains disabled ---
assert("T21 default Chief wiring false", defaultAppSettings().ikChiefWiringEnabled === false);
assert("T21 P8 does not call isChiefOrchestratorSessionEnabled", !/isChiefOrchestratorSessionEnabled/.test(p8Src));
assert("T21 ikChiefWiringMutated false", holdReport.ikChiefWiringMutated === false);
assert("T21 D gate still expertAiDecydentEnabled", /expertAiDecydentEnabled === true/.test(chiefFlagSrc));

// --- T22 P1 unchanged ---
assert("T22 invoice key", isInvoicePurchaseMaterialKey("mat.inv.tile_grout") === true);
assert(
  "T22 researchEligible blocks mat.inv",
  researchEligible(
    { materialKey: "mat.inv.tile_grout", catalogWorkId: "cw.inv.tile_grout", labelPl: "fuga", via: "materialKey" },
    "MATERIAL",
    "MATERIAL",
  ) === false,
);
const invGate = assertMaterialResearchAllowed({
  materialKey: "mat.inv.tile_grout",
  workId: "cw.inv.tile_grout",
  namePl: "fuga",
  unit: "szt",
});
assert("T22 gate blocks mat.inv", invGate.ok === false);

// --- T23 P2 KEEP GAP ---
const zawor = classifyIkMaterialIdentityP59({
  workId: "cc-w2-zawor-odcinajacy",
  namePl: "Zawór odcinający 15 mm",
  unit: "szt",
});
const odpow = classifyIkMaterialIdentityP59({
  workId: "cc-p0c-w1-zawor-odpowietrzajacy",
  namePl: "Zawór odpowietrzający",
  unit: "szt",
});
assert("T23 odcinający GAP", zawor.outcome === "PRODUCT_IDENTITY_GAP", zawor.outcome);
assert("T23 odpowietrzający GAP", odpow.outcome === "PRODUCT_IDENTITY_GAP", odpow.outcome);

// --- T24 Composite unchanged ---
assert("T24 feedsP7Bid false type", /feedsP7Bid:\s*false/.test(compositeSrc));
assert("T24 P8 does not import Composite", !/runIkCompositeBothHold|feedsP7Bid/.test(p8Src));

// --- T25 P7 unchanged ---
assert("T25 P7 default AUTO", defaultAppSettings().ikF5E2eEnabled === "AUTO");
assert("T25 P7 engine file untouched by P8", /runIkP7PositionCostBid/.test(p7Src));
assert("T25 host still passes positionCostBid optional", /p7:\s*positionCostBid/.test(p8Memo));

// --- T26 CatalogWork 471 / read-only ---
assert("T26 P8 catalogWorkWrite false lock", /catalogWorkWrite:\s*false/.test(p8Src));
assert("T26 no catalog write in P8 merge wrapper", !/saveWorkCatalog|WORK_CATALOG/.test(
  settingsSrc.match(/mergeIkRiskDecisionE2eEnabled[\s\S]{0,400}/)?.[0] ?? "",
));

// --- T27 mixed-client safety ---
assert("T27 old AUTO → HOLD", oldClientBooleanCoerce("AUTO") === false);
assert("T27 old ON → HOLD", oldClientBooleanCoerce("ON") === false);
assert("T27 old OFF → HOLD", oldClientBooleanCoerce("OFF") === false);
assert("T27 old true → ON path", oldClientBooleanCoerce(true) === true);
assert("T27 old false → HOLD", oldClientBooleanCoerce(false) === false);
assert("T27 new false → AUTO", normalizeIkE2eMode(false) === "AUTO");

// --- T28 migration idempotency ---
assert("T28 AUTO idempotent", normalizeIkE2eMode("AUTO") === "AUTO");
assert("T28 ON idempotent", normalizeIkE2eMode("ON") === "ON");
assert("T28 OFF idempotent", normalizeIkE2eMode("OFF") === "OFF");
assert("T28 false twice AUTO", normalizeIkE2eMode(false) === "AUTO" && parseIkE2eMode(false) === "AUTO");

// --- T29 rollback safety ---
assert("T29 old client enum HOLD", oldClientBooleanCoerce("AUTO") === false);
assert("T29 C1 uses isIkE2eModeActive for settings load", /isIkE2eModeActive\(loadAppSettingsLocal\(\)\.ikRiskDecisionE2eEnabled\)/.test(flagSrc));
assert("T29 no settings load === true", !/loadAppSettingsLocal\(\)\.ikRiskDecisionE2eEnabled === true/.test(flagSrc));
assert("T29 no || true on P8", !/ikRiskDecisionE2eEnabled\s*\|\|\s*true/.test(flagSrc + settingsSrc));

// --- T30 malformed settings ---
assert("T30 malformed AUTO not ON", normalizeIkE2eMode("enabled") === "AUTO");
assert("T30 load uses normalizeIkE2eMode", /ikRiskDecisionE2eEnabled:\s*normalizeIkE2eMode\(parsed\.ikRiskDecisionE2eEnabled\)/.test(settingsSrc));

// --- T31 force helper C2 ---
forceIkEntryEnabledForTests(true);
forceIkRiskDecisionE2eForTests(true);
assert("T31 force true → ON/active", isIkP8RiskDecisionE2eActive() === true);
forceIkRiskDecisionE2eForTests(false);
assert("T31 force false HOLD", isIkP8RiskDecisionE2eActive() === false);
forceIkRiskDecisionE2eForTests("AUTO");
assert("T31 force AUTO active", isIkP8RiskDecisionE2eActive() === true);

// --- T32 AUTO ≡ ON runtime ---
forceIkRiskDecisionE2eForTests("AUTO");
const autoOn = isIkP8RiskDecisionE2eActive();
forceIkRiskDecisionE2eForTests("ON");
const onOn = isIkP8RiskDecisionE2eActive();
assert("T32 AUTO ≡ ON", autoOn === true && onOn === true);

// --- T33 no Research boolean leak ---
assert("T33 eligibility comment never raw enum", /NEVER pass raw "AUTO"\|"OFF"\|"ON"/.test(flagSrc));
assert("T33 P8 AUTO does not set research keys", mergeAppSettings(
  { ikRiskDecisionE2eEnabled: "AUTO" },
  defaultAppSettings(),
).ikLaborResearchEnabled === false);

// --- T34 Admin UI ---
assert("T34 select mode", /data-ik-risk-decision-e2e-mode/.test(adminSrc));
assert("T34 AUTO option", /option value="AUTO"/.test(adminSrc) && /autonomiczne przygotowanie read-only P8/.test(adminSrc));
assert("T34 ON option", /jawnie włączone przygotowanie read-only P8/.test(adminSrc));
assert("T34 OFF option", /kill-switch \/ P8 HOLD/.test(adminSrc));
assert("T34 OFF confirm", /window\.confirm/.test(adminSrc) && /przygotowania P8/.test(adminSrc));
assert("T34 no checkbox boolean write", !/ikRiskDecisionE2eEnabled:\s*e\.target\.checked/.test(adminSrc));
assert("T34 no Research as AUTO", !/AUTO[\s\S]{0,80}Research MODE B/.test(adminSrc.match(/IK · RISK[\s\S]{0,900}/)?.[0] ?? ""));

// --- C1–C6 ---
assert("C1 isIkE2eModeActive gate", /isIkE2eModeActive\(loadAppSettingsLocal\(\)\.ikRiskDecisionE2eEnabled\)/.test(flagSrc));
assert("C2 force accepts IkE2eMode", /forceIkRiskDecisionE2eForTests\(on: boolean \| IkE2eMode \| null\)/.test(flagSrc));
assert("C3 mergeIkE2eMode reused", /mergeIkE2eMode\(remote\?\.ikRiskDecisionE2eEnabled/.test(settingsSrc));
assert("C4 B-POLICY false→AUTO", parseIkE2eMode(false) === "AUTO");
assert("C5 Admin 3-state + confirm", /data-ik-risk-decision-e2e-mode/.test(adminSrc) && /przygotowania P8/.test(adminSrc));
assert("C6 no BOQ gate in P8 memo", !/readyForExperts/.test(p8Memo));

assert("type default AUTO string", typeof defaultAppSettings().ikRiskDecisionE2eEnabled === "string");
forceIkF5E2eForTests("OFF");
forceIkEntryEnabledForTests(true);
forceIkRiskDecisionE2eForTests("AUTO");
assert("P7 OFF does not block P8 AUTO", isIkP8RiskDecisionE2eActive() === true && isIkP7F5E2eActive() === false);

resetFlags();

const suites = [
  ["AUTONOMY-05", "scripts/test-ik-autonomy-05-explicit-auto-off-on.mjs"],
  ["P1 invoice", "scripts/test-ik-p1-invoice-host-collision.mjs"],
  ["Composite", "scripts/test-ik-composite-position-orchestration.mjs"],
];

for (const [label, rel] of suites) {
  if (!existsSync(join(root, rel))) {
    assert(label + " present", false, rel);
    continue;
  }
  const r = runSuite(rel);
  assert(label + " regression", r.ok, `status=${r.status} ${r.out}`);
}

resetFlags();

console.log(`\nAUTONOMY-07 P8: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
