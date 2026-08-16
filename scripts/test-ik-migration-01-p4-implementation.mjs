/**
 * IK-MIGRATION-01 P4 IMPLEMENTATION — Chief Wiring under IK (≠ D, ≠ Labor).
 * Matrix A–AD (Owner brief). Run: npx vite-node scripts/test-ik-migration-01-p4-implementation.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultAppSettings,
  mergeAppSettings,
  APP_SETTINGS_KEY,
} from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  forceIkAutoIngestForTests,
  forceIkIdentityCoverageForTests,
  forceIkChiefWiringForTests,
  isIkEntryEnabled,
  isIkChiefWiringEnabled,
  isIkP4ChiefWiringPreferenceActive,
  isIkP4ChiefSessionEligible,
  resolveIkP4ChiefEligible,
  resolveIkDetailFirstScreen,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";

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
    console.error("FAIL", name, extra ?? "");
  }
}

const mem = new Map();
globalThis.localStorage = {
  getItem(k) { return mem.has(k) ? mem.get(k) : null; },
  setItem(k, v) { mem.set(String(k), String(v)); },
  removeItem(k) { mem.delete(k); },
  clear() { mem.clear(); },
};

function reset() {
  mem.clear();
  forceIkEntryEnabledForTests(null);
  forceIkAutoIngestForTests(null);
  forceIkIdentityCoverageForTests(null);
  forceIkChiefWiringForTests(null);
}

function setSettings(partial) {
  mem.set(APP_SETTINGS_KEY, JSON.stringify({ ...defaultAppSettings(), ...partial }));
}

const detailSrc = readSrc("src/app/TenderDetailPage.tsx");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
const settingsSrc = readSrc("src/lib/app-settings.ts");
const adminSrc = readSrc("src/app/AdminSettingsModal.tsx");
const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const chiefFlagSrc = readSrc("src/lib/chief-session/flag.ts");
const laborSrc = readSrc("src/lib/intelligent-estimator/ik-labor-expert.ts");

// --- Defaults ---
reset();
assert("default ikChiefWiringEnabled OFF", defaultAppSettings().ikChiefWiringEnabled === false);
assert("default D OFF", defaultAppSettings().expertAiDecydentEnabled === false);
forceIkEntryEnabledForTests(false);
assert("A IK forced OFF", isIkEntryEnabled() === false);
assert("A P4 preference OFF", isIkP4ChiefWiringPreferenceActive() === false);
assert("A resolve eligible false", resolveIkP4ChiefEligible({
  ikEntryEnabled: false,
  ikChiefWiringEnabled: true,
  pricingReady: true,
}) === false);
assert("A first screen ik_entry", resolveIkDetailFirstScreen(false) === "ik_entry");

// --- B: IK ON + P4 OFF ---
reset();
setSettings({ ikEntryEnabled: true, ikChiefWiringEnabled: false });
assert("B IK ON", isIkEntryEnabled() === true);
assert("B P4 OFF", isIkChiefWiringEnabled() === false);
assert("B preference OFF", isIkP4ChiefWiringPreferenceActive() === false);
assert("B eligible false even pricingReady", isIkP4ChiefSessionEligible({ pricingReady: true }) === false);

// --- C: IK ON + P4 ON + no pricingReady ---
reset();
setSettings({ ikEntryEnabled: true, ikChiefWiringEnabled: true });
assert("C preference ON", isIkP4ChiefWiringPreferenceActive() === true);
assert("C pricingReady false → ineligible", isIkP4ChiefSessionEligible({ pricingReady: false }) === false);
assert("C no BOQ gate via pricing", resolveIkP4ChiefEligible({
  ikEntryEnabled: true,
  ikChiefWiringEnabled: true,
  pricingReady: false,
}) === false);

// --- D: pricingReady false explicit ---
assert("D HOLD blocks", resolveIkP4ChiefEligible({
  ikEntryEnabled: true,
  ikChiefWiringEnabled: true,
  pricingReady: true,
  boqStatus: "hold",
}) === false);
assert("D GAP blocks", resolveIkP4ChiefEligible({
  ikEntryEnabled: true,
  ikChiefWiringEnabled: true,
  pricingReady: true,
  boqStatus: "gap",
}) === false);

// --- E: valid path ---
assert("E READY + pricingReady", resolveIkP4ChiefEligible({
  ikEntryEnabled: true,
  ikChiefWiringEnabled: true,
  pricingReady: true,
  boqStatus: "ready",
}) === true);
assert("E session eligible", isIkP4ChiefSessionEligible({ pricingReady: true }) === true);
assert("E PARTIAL allowed when pricingReady", resolveIkP4ChiefEligible({
  ikEntryEnabled: true,
  ikChiefWiringEnabled: true,
  pricingReady: true,
  boqStatus: "partial",
}) === true);

// --- F/G: D separation ---
const mergedP4 = mergeAppSettings(
  { ikEntryEnabled: true, ikChiefWiringEnabled: true },
  defaultAppSettings(),
);
assert("G merge P4 does not flip D", mergedP4.expertAiDecydentEnabled === false);
assert("G merge sets P4", mergedP4.ikChiefWiringEnabled === true);
assert("G merge does not flip IDENTITY", mergedP4.ikIdentityCoverageEnabled === false);
assert(
  "G DetailPage keeps D path via isChiefSessionStackEnabled",
  /isChiefSessionStackEnabled\(expertEffective\)/.test(detailSrc)
  || /dChiefEnabled\s*=\s*isChiefSessionStackEnabled/.test(detailSrc),
);
assert(
  "G DetailPage ORs P4 eligible",
  /dChiefEnabled\s*\|\|\s*p4ChiefEligible/.test(detailSrc)
  || /p4ChiefEligible\s*\|\|\s*dChiefEnabled/.test(detailSrc)
  || /chiefSessionEnabled\s*=\s*dChiefEnabled\s*\|\|\s*p4ChiefEligible/.test(detailSrc),
);
assert("G Chief D flag still reads expertAiDecydentEnabled", /expertAiDecydentEnabled/.test(chiefFlagSrc));
assert("G P4 flag module does not set D", !/expertAiDecydentEnabled/.test(flagSrc));

// --- Host wiring markers ---
assert("Detail uses isIkP4ChiefSessionEligible", /isIkP4ChiefSessionEligible/.test(detailSrc));
assert("Detail data-ik-p4-chief-wiring", /data-ik-p4-chief-wiring/.test(detailSrc));
assert("Detail data-ik-p4-chief-eligible", /data-ik-p4-chief-eligible/.test(detailSrc));
assert("Admin P4 toggle", /data-ik-chief-wiring-toggle/.test(adminSrc));
assert("Settings field", /ikChiefWiringEnabled/.test(settingsSrc));
assert("mergeIkChiefWiringEnabled", /mergeIkChiefWiringEnabled/.test(settingsSrc));
assert("REUSE useChiefOrchestratorSession", /useChiefOrchestratorSession/.test(detailSrc));

// --- Research / Accept / F5 guards ---
assert("O host EXECUTE_RESEARCH false", /IK_ENTRY_SHELL_EXECUTE_RESEARCH\s*=\s*false/.test(hostSrc));
assert("O host RUN_RATE_EXPERTS false", /IK_ENTRY_SHELL_RUN_RATE_EXPERTS\s*=\s*false/.test(hostSrc));
assert("O DetailPage does not call labor expert", !/runIkMasterBoqLaborExpert/.test(detailSrc));
assert("P DetailPage does not call material expert", !/runIkMasterBoqMaterialExpert/.test(detailSrc));
assert("P DetailPage no labor gap research", !/runIkLaborGapResearch/.test(detailSrc));
assert("Q no executeResearch true in DetailPage", !/executeResearch:\s*true/.test(detailSrc));
assert("R no Accept in DetailPage P4 path", !/acceptWorkRateResearchCandidate|acceptCatalog/.test(detailSrc));
assert("S no CatalogWork write invent", !/createCatalogWork|writeCatalogWork/.test(detailSrc));
assert("U DetailPage does not import tender-pricing-auto for P4", !/tender-pricing-auto|useTenderPricingAuto/.test(detailSrc));
assert("V no Bid proposal invent in DetailPage", !/computeTenderBidProposal/.test(detailSrc));

// Labor default research risk documented — P4 must not call it
assert("labor API executeResearch requires === true (P5 hardened)", /executeResearch\s*=\s*opts\.executeResearch\s*===\s*true/.test(laborSrc));
assert("labor API no longer uses !== false default", !/executeResearch\s*=\s*opts\.executeResearch\s*!==\s*false/.test(laborSrc));
assert("P4 path does not import ik-labor-expert in DetailPage", !/ik-labor-expert/.test(detailSrc));

// --- Force overrides ---
forceIkEntryEnabledForTests(true);
forceIkChiefWiringForTests(false);
assert("force P4 OFF beats settings", isIkP4ChiefSessionEligible({ pricingReady: true }) === false);
forceIkChiefWiringForTests(true);
assert("force P4 ON", isIkP4ChiefSessionEligible({ pricingReady: true }) === true);
forceIkEntryEnabledForTests(false);
assert("force IK OFF kills P4", isIkP4ChiefSessionEligible({ pricingReady: true }) === false);

// --- Regression suite presence ---
assert("Y P3 impl test", existsSync(join(root, "scripts/test-ik-migration-01-p3-implementation.mjs")));
assert("Z P2 impl test", existsSync(join(root, "scripts/test-ik-migration-01-p2-implementation.mjs")));
assert("AA P5.26 test", existsSync(join(root, "scripts/test-ik-migration-01-p526-fix-category-pass2.mjs")));
assert("AB P5.27 test", existsSync(join(root, "scripts/test-ik-migration-01-p527-fix-existing-category-reuse.mjs")));
assert("AC P5.31 test", existsSync(join(root, "scripts/test-ik-migration-01-p531-category-key-create-route.mjs")));
assert("AD P5.32 test", existsSync(join(root, "scripts/test-ik-migration-01-p532-fix-edge-category-route-parity.mjs")));
assert("legacy labor harness is P5 filename debt", existsSync(join(root, "scripts/test-ik-migration-01-p4-labor-expert.mjs")));
assert("P4 plan DF present", existsSync(join(root, "docs/architecture/IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md")));
assert("Chief session test present", existsSync(join(root, "scripts/test-wire-chief-session-01.mjs")));

// Truth / sourceRef — DetailPage still uses chief dossier builders
assert("W chief dossier VM", /buildChiefDossierViewModel/.test(detailSrc));
assert("X no P5.33 invent", !/P5\.33|p533/.test(detailSrc + flagSrc));

reset();

console.log(`\nP4 IMPLEMENTATION: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
