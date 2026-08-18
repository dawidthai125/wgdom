/**
 * IK AUTONOMY-05 — Explicit AUTO / OFF / ON for P5 + P6.
 * Run: npx vite-node scripts/test-ik-autonomy-05-explicit-auto-off-on.mjs
 *
 * ZERO production KV write · ZERO Research HTTP · ZERO Accept.
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
  mergeIkE2eMode,
  normalizeIkE2eMode,
  parseIkE2eMode,
  isIkE2eModeActive,
} from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  forceIkLaborE2eForTests,
  forceIkLaborResearchForTests,
  forceIkMaterialE2eForTests,
  forceIkMaterialResearchForTests,
  forceIkF5E2eForTests,
  isIkP5LaborE2eActive,
  isIkP5LaborExecuteResearchActive,
  isIkP6MaterialE2eActive,
  isIkP6MaterialExecuteResearchActive,
  isIkP7F5E2eActive,
  resolveIkP5LaborExecuteResearch,
  resolveIkP6MaterialExecuteResearch,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
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

function oldClientBooleanCoerce(value) {
  return value === true;
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

function resetFlags() {
  forceIkEntryEnabledForTests(null);
  forceIkLaborE2eForTests(null);
  forceIkLaborResearchForTests(null);
  forceIkMaterialE2eForTests(null);
  forceIkMaterialResearchForTests(null);
  forceIkF5E2eForTests(null);
}

resetFlags();
ls.clear();

// --- T01–T03 legacy migration B-POLICY ---
assert("T01 true → ON", normalizeIkE2eMode(true) === "ON");
assert("T02 missing → AUTO", normalizeIkE2eMode(undefined) === "AUTO" && parseIkE2eMode(undefined) === null);
assert("T03 false → AUTO (not OFF)", normalizeIkE2eMode(false) === "AUTO");
assert("T03b false is not OFF", parseIkE2eMode(false) !== "OFF");

// --- T04–T06 AUTO/ON/OFF runtime ---
forceIkEntryEnabledForTests(true);
forceIkLaborE2eForTests("AUTO");
forceIkMaterialE2eForTests("AUTO");
forceIkLaborResearchForTests(false);
forceIkMaterialResearchForTests(false);
assert("T04 AUTO → P5 MODE A", isIkP5LaborE2eActive() === true);
assert("T04 AUTO → P6 MODE A", isIkP6MaterialE2eActive() === true);

forceIkLaborE2eForTests("ON");
forceIkMaterialE2eForTests("ON");
assert("T05 ON → P5 MODE A", isIkP5LaborE2eActive() === true);
assert("T05 ON → P6 MODE A", isIkP6MaterialE2eActive() === true);

forceIkLaborE2eForTests("OFF");
forceIkMaterialE2eForTests("OFF");
assert("T06 OFF → P5 HOLD", isIkP5LaborE2eActive() === false);
assert("T06 OFF → P6 HOLD", isIkP6MaterialE2eActive() === false);
assert("T06 boolean false → HOLD", (() => {
  forceIkLaborE2eForTests(false);
  return isIkP5LaborE2eActive() === false;
})());

// --- T07–T10 combinations ---
forceIkLaborE2eForTests("AUTO");
forceIkMaterialE2eForTests("AUTO");
assert("T07 P5 AUTO + P6 AUTO", isIkP5LaborE2eActive() === true && isIkP6MaterialE2eActive() === true);

forceIkLaborE2eForTests("OFF");
forceIkMaterialE2eForTests("AUTO");
assert("T08 P5 OFF + P6 AUTO", isIkP5LaborE2eActive() === false && isIkP6MaterialE2eActive() === true);

forceIkLaborE2eForTests("AUTO");
forceIkMaterialE2eForTests("OFF");
assert("T09 P5 AUTO + P6 OFF", isIkP5LaborE2eActive() === true && isIkP6MaterialE2eActive() === false);

forceIkLaborE2eForTests("OFF");
forceIkMaterialE2eForTests("OFF");
assert("T10 P5 OFF + P6 OFF", isIkP5LaborE2eActive() === false && isIkP6MaterialE2eActive() === false);

// --- T11 AUTO → executeResearch permission (leftover research boolean ignored) ---
forceIkLaborE2eForTests("AUTO");
forceIkMaterialE2eForTests("AUTO");
forceIkLaborResearchForTests(false);
forceIkMaterialResearchForTests(false);
assert("T11 AUTO leftover research false → Labor permission true", isIkP5LaborExecuteResearchActive() === true);
assert("T11 AUTO leftover research false → Material permission true", isIkP6MaterialExecuteResearchActive() === true);
assert(
  "T11 raw AUTO string is not === true (C3)",
  resolveIkP5LaborExecuteResearch({
    ikEntryEnabled: true,
    ikLaborE2eEnabled: /** @type {any} */ ("AUTO"),
  }) === false,
);
assert(
  "T11 MODE A boolean permission (no research conjunct)",
  resolveIkP5LaborExecuteResearch({
    ikEntryEnabled: true,
    ikLaborE2eEnabled: true,
  }) === true,
);

// --- T12 / T13 write + Accept source contracts ---
const laborSrc = readSrc("src/lib/intelligent-estimator/ik-labor-expert.ts");
const matSrc = readSrc("src/lib/intelligent-estimator/ik-material-expert.ts");
const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const settingsSrc = readSrc("src/lib/app-settings.ts");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
assert("T12 executeResearch === true only (labor)", /executeResearch === true/.test(laborSrc));
assert("T12 executeResearch === true only (material)", /executeResearch === true/.test(matSrc));
assert("T12 host Labor executeResearch boolean", /executeResearch:\s*p5ResearchOn === true/.test(hostSrc));
assert("T12 host Material executeResearch boolean", /executeResearch:\s*p6ResearchOn === true/.test(hostSrc));
assert("T12 no || true in helpers", !/isIkP5LaborE2eActive\(\)\s*\|\|\s*true/.test(flagSrc));
assert("T12 settings no || true mode", !/normalizeIkE2eMode[^\n]*\|\|\s*true/.test(settingsSrc));
assert("T13 labor autoAcceptExecuted = false", /autoAcceptExecuted = false/.test(laborSrc));
assert("T13 material autoAcceptExecuted = false", /autoAcceptExecuted = false/.test(matSrc));
assert("T13 host does not call Accept", !/acceptIkLaborResearchAndNotify\(/.test(hostSrc) && !/acceptMaterialResearchCandidate\(/.test(hostSrc));

// --- T14 D remains false ---
const d = defaultAppSettings();
assert("T14 default D false", d.expertAiDecydentEnabled === false);
const mergedD = mergeAppSettings({ ikLaborE2eEnabled: "AUTO", ikMaterialE2eEnabled: "AUTO" }, d);
assert("T14 merge AUTO does not flip D", mergedD.expertAiDecydentEnabled === false);

// --- T15 mat.inv.* blocked ---
const invId = {
  materialKey: "mat.inv.tile_grout",
  catalogWorkId: "cw.inv.tile_grout",
  labelPl: "fuga invoice",
  via: "materialKey",
};
assert("T15 invoice key helper", isInvoicePurchaseMaterialKey("mat.inv.tile_grout") === true);
assert("T15 researchEligible blocks mat.inv", researchEligible(invId, "MATERIAL", "MATERIAL") === false);
const invGate = assertMaterialResearchAllowed({
  materialKey: "mat.inv.tile_grout",
  workId: "cw.inv.tile_grout",
  namePl: "fuga",
  unit: "szt",
});
assert("T15 classification gate blocks mat.inv", invGate.ok === false);

// --- T16 canonical mat.* allowed through gate ---
const canGate = assertMaterialResearchAllowed({
  materialKey: "mat.cable.ydyp_3x2_5",
  workId: "cw.cable.ydyp",
  namePl: "YDYp 3x2,5",
  unit: "m",
});
assert("T16 canonical mat.* gate ok (or not invoice)", invGate.ok === false && canGate.ok === true);

// --- T17 P2 KEEP GAP ---
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
assert("T17 odcinający PRODUCT_IDENTITY_GAP", zawor.outcome === "PRODUCT_IDENTITY_GAP", zawor.outcome);
assert("T17 odpowietrzający PRODUCT_IDENTITY_GAP", odpow.outcome === "PRODUCT_IDENTITY_GAP", odpow.outcome);

// --- T21 Admin save preserves enum ---
const adminSrc = readSrc("src/app/AdminSettingsModal.tsx");
assert("T21 Admin 3-state select P5", /data-ik-labor-e2e-mode/.test(adminSrc) && /option value="AUTO"/.test(adminSrc));
assert("T21 Admin 3-state select P6", /data-ik-material-e2e-mode/.test(adminSrc));
assert("T21 AUTO copy", /IK automatycznie wykonuje read-only MODE A/.test(adminSrc));
assert("T21 ON copy", /MODE A wymuszony/.test(adminSrc));
assert("T21 OFF copy", /IK nie uruchamia tego eksperta/.test(adminSrc));
assert("T21 no P5 checkbox boolean write", !/ikLaborE2eEnabled:\s*e\.target\.checked/.test(adminSrc));
assert("T21 no P6 checkbox boolean write", !/ikMaterialE2eEnabled:\s*e\.target\.checked/.test(adminSrc));

ls.clear();
const saved = { ...defaultAppSettings(), ikLaborE2eEnabled: "OFF", ikMaterialE2eEnabled: "AUTO" };
ls.set(APP_SETTINGS_KEY, JSON.stringify(saved));
const loaded = loadAppSettingsLocal();
assert("T21 load preserves OFF", loaded.ikLaborE2eEnabled === "OFF");
assert("T21 load preserves AUTO", loaded.ikMaterialE2eEnabled === "AUTO");

// --- T22 Cloud merge preserves enum + OFF wins ---
const localOff = { ...defaultAppSettings(), ikLaborE2eEnabled: "OFF", ikMaterialE2eEnabled: "AUTO" };
const remoteAuto = { ikLaborE2eEnabled: "AUTO", ikMaterialE2eEnabled: "ON" };
const m1 = mergeAppSettings(remoteAuto, localOff);
assert("T22 OFF wins vs remote AUTO", m1.ikLaborE2eEnabled === "OFF");
assert("T22 remote ON for P6", m1.ikMaterialE2eEnabled === "ON");

const localAuto = { ...defaultAppSettings(), ikLaborE2eEnabled: "AUTO" };
const remoteOff = { ikLaborE2eEnabled: "OFF" };
const m2 = mergeAppSettings(remoteOff, localAuto);
assert("T22 remote OFF wins vs local AUTO", m2.ikLaborE2eEnabled === "OFF");

const m3 = mergeAppSettings({ ikLaborE2eEnabled: true }, defaultAppSettings());
assert("T22 legacy true → ON", m3.ikLaborE2eEnabled === "ON");

const m4 = mergeAppSettings({ ikLaborE2eEnabled: false }, { ...defaultAppSettings(), ikLaborE2eEnabled: "ON" });
assert("T22 legacy false → AUTO (not OFF)", m4.ikLaborE2eEnabled === "AUTO");

const m5 = mergeAppSettings({ ikLaborE2eEnabled: false }, { ...defaultAppSettings(), ikLaborE2eEnabled: "OFF" });
assert("T22 C1 OFF wins vs legacy false", m5.ikLaborE2eEnabled === "OFF");
assert("T22 mergeIkE2eMode OFF vs ON", mergeIkE2eMode("ON", "OFF") === "OFF");

// --- T23 migration idempotent ---
assert("T23 AUTO→AUTO", normalizeIkE2eMode(normalizeIkE2eMode("AUTO")) === "AUTO");
assert("T23 OFF→OFF", normalizeIkE2eMode("OFF") === "OFF" && normalizeIkE2eMode(normalizeIkE2eMode("OFF")) === "OFF");
assert("T23 ON→ON", normalizeIkE2eMode("ON") === "ON");
ls.set(APP_SETTINGS_KEY, JSON.stringify({ ...defaultAppSettings(), ikLaborE2eEnabled: "OFF" }));
const once = loadAppSettingsLocal();
ls.set(APP_SETTINGS_KEY, JSON.stringify(once));
const twice = loadAppSettingsLocal();
assert("T23 reload OFF stays OFF", once.ikLaborE2eEnabled === "OFF" && twice.ikLaborE2eEnabled === "OFF");

// --- T24 Research-on-Miss permission (leftover lever ignored; OFF still kill-switch) ---
forceIkLaborE2eForTests("AUTO");
forceIkLaborResearchForTests(false);
forceIkEntryEnabledForTests(true);
assert("T24 AUTO + leftover research false → MODE B permission", isIkP5LaborExecuteResearchActive() === true);
forceIkLaborE2eForTests("OFF");
assert("T24 OFF → no research permission", isIkP5LaborExecuteResearchActive() === false);
forceIkLaborE2eForTests("ON");
forceIkLaborResearchForTests(false);
assert("T24 ON + leftover research false → permission true", isIkP5LaborExecuteResearchActive() === true);
assert("T24 isIkE2eModeActive AUTO", isIkE2eModeActive("AUTO") === true);
assert("T24 isIkE2eModeActive OFF", isIkE2eModeActive("OFF") === false);

// --- T25 Final Bid Owner-only (P7 independent lever; default AUTO after AUTONOMY-06) ---
forceIkF5E2eForTests(null);
forceIkEntryEnabledForTests(true);
forceIkLaborE2eForTests("AUTO");
assert("T25 default P7 AUTO", defaultAppSettings().ikF5E2eEnabled === "AUTO");
forceIkF5E2eForTests("OFF");
assert("T25 P7 OFF independent of P5 AUTO", isIkP7F5E2eActive() === false);
assert("T25 P5 still AUTO-capable", isIkP5LaborE2eActive() === true);
assert(
  "T25 P7 source independent lever",
  /ikF5E2eEnabled/.test(readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts")),
);

// --- T14 mixed-client fail-safe (C4) ---
assert("A14 old client AUTO → HOLD", oldClientBooleanCoerce("AUTO") === false);
assert("A14 old client OFF → HOLD", oldClientBooleanCoerce("OFF") === false);
assert("A14 old client ON → HOLD", oldClientBooleanCoerce("ON") === false);
assert("A14 old client true → ON path", oldClientBooleanCoerce(true) === true);

// --- defaults ---
assert("C6 default P5 AUTO", defaultAppSettings().ikLaborE2eEnabled === "AUTO");
assert("C6 default P6 AUTO", defaultAppSettings().ikMaterialE2eEnabled === "AUTO");
assert("C6 research still false", defaultAppSettings().ikLaborResearchEnabled === false && defaultAppSettings().ikMaterialResearchEnabled === false);

// --- T20 CatalogWork lock (source) ---
assert("T20 no catalog write in app-settings", !/saveWorkCatalog|WORK_CATALOG/.test(settingsSrc));
assert("T20 no catalog write in ik-entry-flag", !/saveWorkCatalog|WORK_CATALOG/.test(flagSrc));
assert("T20 host no catalog mutation API", !/saveWorkCatalogStoreLocal\(/.test(hostSrc));

resetFlags();

function runSuite(rel) {
  const r2 = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite-node", rel],
    { cwd: root, encoding: "utf8", shell: true },
  );
  const out = (r2.stdout || "") + (r2.stderr || "");
  const ok = r2.status === 0;
  return { ok, status: r2.status, out: out.slice(-800) };
}

const p1Path = "scripts/test-ik-p1-invoice-host-collision.mjs";
if (existsSync(join(root, p1Path))) {
  const r = runSuite(p1Path);
  assert("T18 P1 regression", r.ok, r.out);
} else {
  assert("T18 P1 regression present", false);
}

const compPath = "scripts/test-ik-composite-position-orchestration.mjs";
if (existsSync(join(root, compPath))) {
  const r = runSuite(compPath);
  assert("T19 Composite regression", r.ok, r.out);
} else {
  assert("T19 Composite regression present", false);
}

console.log(`\nIK AUTONOMY-05: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
