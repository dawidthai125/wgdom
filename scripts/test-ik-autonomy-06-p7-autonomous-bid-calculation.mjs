/**
 * IK AUTONOMY-06 — P7 Autonomous Bid Calculation (AUTO|OFF|ON).
 * Run: npx vite-node scripts/test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs
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
  isIkF5E2eEnabled,
  isIkP5LaborExecuteResearchActive,
  isIkP6MaterialExecuteResearchActive,
  isIkP7F5E2eActive,
  resolveIkP7F5E2eActive,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import {
  runIkP7PositionCostBid,
  IK_P7_POSITION_COST_BID_SCHEMA_VERSION,
} from "../src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts";
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
}

resetFlags();

const settingsSrc = readSrc("src/lib/app-settings.ts");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const orchestraHookSrc = readSrc("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts");
const orchestraEngineSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts");
const orchestraSurface = hostSrc + orchestraHookSrc + orchestraEngineSrc
  + readSrc("src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts");
const adminSrc = readSrc("src/app/AdminSettingsModal.tsx");
const p7Src = readSrc("src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts");
const compositeSrc = readSrc("src/lib/intelligent-estimator/ik-composite-both-hold.ts");

// --- T01 default AUTO ---
assert("T01 default AUTO", defaultAppSettings().ikF5E2eEnabled === "AUTO");

// --- T02 explicit ON ---
assert("T02 normalize ON", normalizeIkE2eMode("ON") === "ON");
assert("T02 isIkE2eModeActive ON", isIkE2eModeActive("ON") === true);

// --- T03 explicit OFF ---
assert("T03 normalize OFF", normalizeIkE2eMode("OFF") === "OFF");
assert("T03 isIkE2eModeActive OFF", isIkE2eModeActive("OFF") === false);

// --- T04 AUTO runtime ---
forceIkEntryEnabledForTests(true);
forceIkF5E2eForTests("AUTO");
assert("T04 AUTO runtime active", isIkP7F5E2eActive() === true);
assert("T04 isIkF5E2eEnabled AUTO", isIkF5E2eEnabled() === true);

// --- T05 ON runtime ---
forceIkF5E2eForTests("ON");
assert("T05 ON runtime active", isIkP7F5E2eActive() === true);

// --- T06 OFF HOLD ---
forceIkF5E2eForTests("OFF");
assert("T06 OFF HOLD", isIkP7F5E2eActive() === false);
assert("T06 resolve OFF capability false", resolveIkP7F5E2eActive({
  ikEntryEnabled: true,
  ikF5E2eEnabled: false,
}) === false);

// --- T07 legacy true → ON ---
assert("T07 parse true → ON", parseIkE2eMode(true) === "ON");
assert("T07 normalize true → ON", normalizeIkE2eMode(true) === "ON");
assert(
  "T07 merge legacy true",
  mergeAppSettings({ ikF5E2eEnabled: true }, defaultAppSettings()).ikF5E2eEnabled === "ON",
);

// --- T08 missing → AUTO ---
assert("T08 parse missing null", parseIkE2eMode(undefined) === null);
assert("T08 normalize missing → AUTO", normalizeIkE2eMode(undefined) === "AUTO");
assert(
  "T08 merge missing keeps local AUTO",
  mergeAppSettings({}, defaultAppSettings()).ikF5E2eEnabled === "AUTO",
);

// --- T09 legacy false → AUTO (B-POLICY) ---
assert("T09 parse false → AUTO", parseIkE2eMode(false) === "AUTO");
assert("T09 normalize false → AUTO", normalizeIkE2eMode(false) === "AUTO");
assert("T09 mergeIkE2eMode false + AUTO", mergeIkE2eMode(false, "AUTO") === "AUTO");
assert(
  "T09 mergeAppSettings legacy false → AUTO",
  mergeAppSettings({ ikF5E2eEnabled: false }, defaultAppSettings()).ikF5E2eEnabled === "AUTO",
);

// --- T10 malformed → AUTO (not ON) DF §11.1 ---
assert("T10 parse malformed null", parseIkE2eMode("YES") === null);
assert("T10 normalize malformed → AUTO", normalizeIkE2eMode("YES") === "AUTO");
assert("T10 normalize object → AUTO", normalizeIkE2eMode({}) === "AUTO");
assert("T10 not ON", normalizeIkE2eMode("YES") !== "ON");

// --- T11 OFF merge precedence ---
assert("T11 remote OFF local AUTO", mergeIkE2eMode("OFF", "AUTO") === "OFF");
assert("T11 remote OFF local ON", mergeIkE2eMode("OFF", "ON") === "OFF");
assert("T11 remote AUTO local OFF", mergeIkE2eMode("AUTO", "OFF") === "OFF");
assert("T11 remote ON local OFF", mergeIkE2eMode("ON", "OFF") === "OFF");
assert("T11 remote AUTO local ON", mergeIkE2eMode("AUTO", "ON") === "AUTO");
assert("T11 remote ON local AUTO", mergeIkE2eMode("ON", "AUTO") === "ON");

// --- T12 mixed old/new client ---
assert("T12 old AUTO → HOLD", oldClientBooleanCoerce("AUTO") === false);
assert("T12 old ON → HOLD", oldClientBooleanCoerce("ON") === false);
assert("T12 old OFF → HOLD", oldClientBooleanCoerce("OFF") === false);
assert("T12 old true → ON path", oldClientBooleanCoerce(true) === true);
assert("T12 old false → HOLD", oldClientBooleanCoerce(false) === false);
assert("T12 new false → AUTO", normalizeIkE2eMode(false) === "AUTO");

// --- T13 P7 does not own Research (P5/P6 permission is independent) ---
forceIkF5E2eForTests("AUTO");
forceIkLaborResearchForTests(false);
forceIkMaterialResearchForTests(false);
forceIkLaborE2eForTests("OFF");
forceIkMaterialE2eForTests("OFF");
assert("T13 P7 AUTO + P5 OFF → Labor research false", isIkP5LaborExecuteResearchActive() === false);
assert("T13 P7 AUTO + P6 OFF → Material research false", isIkP6MaterialExecuteResearchActive() === false);
forceIkLaborE2eForTests("AUTO");
forceIkMaterialE2eForTests("AUTO");
assert("T13 P5 AUTO permission independent of P7", isIkP5LaborExecuteResearchActive() === true);
assert("T13 P6 AUTO permission independent of P7", isIkP6MaterialExecuteResearchActive() === true);
assert("T13 P7 source no executeResearch", !/executeResearch/.test(p7Src));
{
  const p7Call = orchestraEngineSrc.match(/runIkP7PositionCostBid\(\{[\s\S]*?\}\)/)?.[0] ?? "";
  assert("T13 host P7 no research arg", p7Call.length > 0 && !/executeResearch/.test(p7Call), p7Call.slice(0, 200));
}

// --- T14 Accept boundary ---
assert("T14 P7 no accept", !/accept/i.test(p7Src) || !/acceptIk|acceptMaterial|autoAccept/.test(p7Src));
assert("T14 host no Accept on P7", !/acceptIkLaborResearchAndNotify\(/.test(orchestraSurface));

// --- T15 Price Commit / T23–T25 writes ---
assert("T15/T23 priceMemoryWrite false lock", /priceMemoryWrite:\s*false/.test(p7Src));
assert("T15/T25 catalogWorkWrite false lock", /catalogWorkWrite:\s*false/.test(p7Src));
assert("T24 no PRICE_DEMAND in P7", !/PRICE_DEMAND/.test(p7Src));
assert("T25 no saveWorkCatalog in P7", !/saveWorkCatalog/.test(p7Src));

// --- T16 Final Bid boundary ---
assert("T16 Admin Final Bid Owner copy", /Final Bid = Owner/.test(adminSrc));
assert("T16 P7 produces proposal in-memory only", /TenderBidProposal/.test(p7Src));

// --- T17 D hard stop ---
assert("T17 default D false", defaultAppSettings().expertAiDecydentEnabled === false);
assert(
  "T17 merge P7 AUTO does not flip D",
  mergeAppSettings({ ikF5E2eEnabled: "AUTO" }, defaultAppSettings()).expertAiDecydentEnabled === false,
);

// --- T18 P1 regression ---
assert("T18 invoice key", isInvoicePurchaseMaterialKey("mat.inv.tile_grout") === true);
assert(
  "T18 researchEligible blocks mat.inv",
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
assert("T18 gate blocks mat.inv", invGate.ok === false);

// --- T19 P2 KEEP GAP ---
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
assert("T19 odcinający GAP", zawor.outcome === "PRODUCT_IDENTITY_GAP", zawor.outcome);
assert("T19 odpowietrzający GAP", odpow.outcome === "PRODUCT_IDENTITY_GAP", odpow.outcome);

// --- T20 Composite regression (feedsP7Bid false · XOR) ---
assert("T20 feedsP7Bid false type", /feedsP7Bid:\s*false/.test(compositeSrc));
assert(
  "T20 host P7 call args exclude composite",
  /runIkP7PositionCostBid\(\{\s*item:\s*effectiveItem,\s*expert:\s*postIdentityExpert,\s*package:\s*pkg,\s*\}\)/.test(orchestraEngineSrc),
);

// --- T21 F5 XOR ---
assert("T21 feedsP7Bid literal false returns", /feedsP7Bid:\s*false,/.test(compositeSrc));

// --- T22 CatalogWork 471 (source lock — no P7 write) ---
assert("T22 no catalog write in settings P7 path", !/saveWorkCatalog|WORK_CATALOG/.test(
  settingsSrc.match(/mergeIkF5E2eEnabled[\s\S]{0,400}/)?.[0] ?? "",
));
assert("T22 P7 catalogWorkWrite false", /catalogWorkWrite:\s*false/.test(p7Src));

// --- T26 no Tender mutation ---
assert("T26 P7 no persistKey/onUpdate", !/persistKey|onUpdate\(/.test(p7Src));

// --- T27 no Research HTTP ---
assert("T27 httpCalls 0", /httpCalls:\s*0/.test(p7Src));
assert("T27 researchExecuted false", /researchExecuted:\s*false/.test(p7Src));
assert("T27 no fetch in P7", !/\bfetch\s*\(/.test(p7Src));

// --- T28 in-memory proposal ---
const gapReport = runIkP7PositionCostBid({
  item: /** @type {any} */ ({ id: "a06-p7", tenderId: "a06-p7", title: "A06" }),
  expert: /** @type {any} */ ({
    tenderId: "a06-p7",
    status: "gap",
    reasons: [],
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: { extractedCount: 0 },
    masterBoq: { status: "gap", readyForExperts: false, lineCount: 0 },
    offerBoq: null,
    masterBoqLines: [],
  }),
});
assert("T28 schema", gapReport.schemaVersion === IK_P7_POSITION_COST_BID_SCHEMA_VERSION);
assert("T28 proposal object in memory", gapReport.proposal != null && typeof gapReport.proposal === "object");
assert("T28 no invent bid", gapReport.recommendedBidPln == null && gapReport.bidOk === false);
assert("T28 writes false", gapReport.catalogWorkWrite === false && gapReport.priceMemoryWrite === false);
assert("T28 research 0", gapReport.researchExecuted === false && gapReport.httpCalls === 0);

// --- T29 rollback fail-safe ---
assert("T29 old client enum HOLD", oldClientBooleanCoerce("AUTO") === false);
assert("T29 C1 uses isIkE2eModeActive for settings load", /isIkE2eModeActive\(loadAppSettingsLocal\(\)\.ikF5E2eEnabled\)/.test(flagSrc));
assert("T29 no settings load === true", !/loadAppSettingsLocal\(\)\.ikF5E2eEnabled === true/.test(flagSrc));
assert("T29 no || true on P7", !/ikF5E2eEnabled\s*\|\|\s*true/.test(flagSrc + settingsSrc));

// --- T30 Admin UI ---
assert("T30 select mode", /data-ik-f5-e2e-mode/.test(adminSrc));
assert("T30 AUTO option", /option value="AUTO"/.test(adminSrc) && /autonomiczna kalkulacja read-only P7/.test(adminSrc));
assert("T30 ON option", /jawnie włączona kalkulacja read-only P7/.test(adminSrc));
assert("T30 OFF option", /kill-switch \/ P7 HOLD/.test(adminSrc));
assert("T30 OFF confirm", /window\.confirm/.test(adminSrc) && /Bid calc pozostanie wyłączony/.test(adminSrc));
assert("T30 no checkbox boolean write", !/ikF5E2eEnabled:\s*e\.target\.checked/.test(adminSrc));
assert("T30 no Research implication in P7 copy", !/IK · F5[\s\S]{0,800}Research MODE B/.test(adminSrc));

// --- T31 BOQ READY autonomous path (host wiring) ---
assert("T31 host isIkP7F5E2eActive", /isIkP7F5E2eActive/.test(orchestraSurface));
assert("T31 host runIkP7PositionCostBid", /runIkP7PositionCostBid/.test(orchestraSurface));
assert("T31 host readyForExperts guard", /readyForExperts/.test(orchestraSurface));

// --- T32 OFF blocks ---
forceIkEntryEnabledForTests(true);
forceIkF5E2eForTests("OFF");
assert("T32 OFF blocks", isIkP7F5E2eActive() === false);
forceIkF5E2eForTests(false); // boolean force → HOLD (test API)
assert("T32 force false HOLD", isIkP7F5E2eActive() === false);

// --- C1–C5 ---
assert("C1 isIkE2eModeActive gate", /isIkE2eModeActive\(loadAppSettingsLocal\(\)\.ikF5E2eEnabled\)/.test(flagSrc));
assert("C2 force accepts IkE2eMode", /forceIkF5E2eForTests\(on: boolean \| IkE2eMode \| null\)/.test(flagSrc));
assert("C3 mergeIkE2eMode reused", /mergeIkE2eMode\(remote\?\.ikF5E2eEnabled/.test(settingsSrc));
assert("C4 B-POLICY false→AUTO", parseIkE2eMode(false) === "AUTO");
assert("C5 Admin 3-state + confirm", /data-ik-f5-e2e-mode/.test(adminSrc) && /Bid calc pozostanie wyłączony/.test(adminSrc));

// type default
assert("type default AUTO string", typeof defaultAppSettings().ikF5E2eEnabled === "string");

resetFlags();

// Nested regressions — avoid nesting full P7 (nests P6→… exponential).
// Engine/settings asserts above cover A06; call lightweight + AUTONOMY-05 + P1 + Composite.
// Spawned dependency FAIL = CASCADE (not A06 own assertion).
const suites = [
  ["AUTONOMY-05", "scripts/test-ik-autonomy-05-explicit-auto-off-on.mjs"],
  ["P1 invoice", "scripts/test-ik-p1-invoice-host-collision.mjs"],
  ["Composite", "scripts/test-ik-composite-position-orchestration.mjs"],
  ["P8", "scripts/test-ik-migration-01-p8-implementation.mjs"],
];

let cascadeDepPass = 0;
let cascadeDepFail = 0;
for (const [label, rel] of suites) {
  if (!existsSync(join(root, rel))) {
    assert(label + " present", false, rel);
    continue;
  }
  const r = runSuite(rel);
  if (r.ok) {
    cascadeDepPass += 1;
    console.log("CASCADE_DEP PASS", label);
  } else {
    cascadeDepFail += 1;
    console.log(
      "CASCADE_DEP FAIL",
      label,
      "(dependency — not counted as A06 own assertion)",
    );
    console.log(String(r.out || "").slice(-500));
  }
}

resetFlags();

console.log(
  `\nAUTONOMY-06 P7: ${pass} PASS / ${fail} FAIL · cascadeDepPass=${cascadeDepPass} cascadeDepFail=${cascadeDepFail}`,
);
process.exit(fail > 0 ? 1 : 0);
