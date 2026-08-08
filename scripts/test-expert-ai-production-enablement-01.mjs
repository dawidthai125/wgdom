/**
 * EXPERT-AI-PRODUCTION-ENABLEMENT-01 — precedence · coupling · defaults.
 * Run: npx vite-node scripts/test-expert-ai-production-enablement-01.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultAppSettings,
  mergeAppSettings,
  mergeExpertAiDecydentEnabled,
  APP_SETTINGS_KEY,
} from "../src/lib/app-settings.ts";
import {
  CHIEF_ORCHESTRATOR_SESSION_LS_KEY,
  forceChiefOrchestratorSessionForTests,
  isChiefOrchestratorSessionEnabled,
} from "../src/lib/chief-session/flag.ts";
import {
  DECISION_WORKSPACE_LS_KEY,
  forceDecisionWorkspaceForTests,
  isDecisionWorkspaceEnabled,
} from "../src/lib/decision-workspace-ui/flag.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

/** Minimal LS stub for Node harness. */
const mem = new Map();
globalThis.localStorage = {
  getItem(k) {
    return mem.has(k) ? mem.get(k) : null;
  },
  setItem(k, v) {
    mem.set(String(k), String(v));
  },
  removeItem(k) {
    mem.delete(k);
  },
  clear() {
    mem.clear();
  },
};

function reset() {
  mem.clear();
  forceChiefOrchestratorSessionForTests(null);
  forceDecisionWorkspaceForTests(null);
}

function setAppSettingsExpert(on) {
  const base = defaultAppSettings();
  mem.set(
    APP_SETTINGS_KEY,
    JSON.stringify({ ...base, expertAiDecydentEnabled: on === true }),
  );
}

console.log("=== EXPERT-AI-PRODUCTION-ENABLEMENT-01 ===\n");

reset();
const d = defaultAppSettings();
assert("default expertAiDecydentEnabled false", d.expertAiDecydentEnabled === false);

assert(
  "merge remote ON",
  mergeExpertAiDecydentEnabled({ expertAiDecydentEnabled: true }, d) === true,
);
assert(
  "merge remote OFF beats local ON",
  mergeExpertAiDecydentEnabled(
    { expertAiDecydentEnabled: false },
    { ...d, expertAiDecydentEnabled: true },
  ) === false,
);
assert(
  "mergeAppSettings preserves field",
  mergeAppSettings({ expertAiDecydentEnabled: true }, d).expertAiDecydentEnabled ===
    true,
);

// AppSettings OFF · no LS
reset();
setAppSettingsExpert(false);
assert("AppSettings OFF → Session OFF", isChiefOrchestratorSessionEnabled() === false);
assert("AppSettings OFF → Decision OFF", isDecisionWorkspaceEnabled() === false);

// AppSettings ON · no LS
reset();
setAppSettingsExpert(true);
assert("AppSettings ON → Session ON", isChiefOrchestratorSessionEnabled() === true);
assert("AppSettings ON → Decision ON", isDecisionWorkspaceEnabled() === true);

// LS "0" overrides AppSettings ON
reset();
setAppSettingsExpert(true);
mem.set(CHIEF_ORCHESTRATOR_SESSION_LS_KEY, "0");
assert("LS Session 0 → Session OFF", isChiefOrchestratorSessionEnabled() === false);
assert("LS Session 0 → Decision OFF (coupling)", isDecisionWorkspaceEnabled() === false);

reset();
setAppSettingsExpert(true);
mem.set(DECISION_WORKSPACE_LS_KEY, "0");
assert("LS Decision 0 → Session still ON", isChiefOrchestratorSessionEnabled() === true);
assert("LS Decision 0 → Decision OFF", isDecisionWorkspaceEnabled() === false);

// LS "1" OV when AppSettings OFF
reset();
setAppSettingsExpert(false);
mem.set(CHIEF_ORCHESTRATOR_SESSION_LS_KEY, "1");
assert("LS Session 1 OV → Session ON", isChiefOrchestratorSessionEnabled() === true);
assert(
  "LS Session 1 alone · Decision unset → Decision OFF (AppSettings false)",
  isDecisionWorkspaceEnabled() === false,
);

reset();
setAppSettingsExpert(false);
mem.set(DECISION_WORKSPACE_LS_KEY, "1");
assert(
  "LS Decision 1 alone → Decision OFF (Session OFF coupling)",
  isDecisionWorkspaceEnabled() === false,
);

reset();
setAppSettingsExpert(false);
mem.set(CHIEF_ORCHESTRATOR_SESSION_LS_KEY, "1");
mem.set(DECISION_WORKSPACE_LS_KEY, "1");
assert("LS both 1 OV → Session ON", isChiefOrchestratorSessionEnabled() === true);
assert("LS both 1 OV → Decision ON", isDecisionWorkspaceEnabled() === true);

// Precedence: 0 > 1
reset();
setAppSettingsExpert(true);
mem.set(CHIEF_ORCHESTRATOR_SESSION_LS_KEY, "0");
// If both somehow set, getItem returns last set — DF says "0" wins when raw==="0".
// Single key can't be both; verify 0 wins over AppSettings (already) and 1 alone.
mem.set(CHIEF_ORCHESTRATOR_SESSION_LS_KEY, "1");
assert("LS Session 1 (after) → ON", isChiefOrchestratorSessionEnabled() === true);
mem.set(CHIEF_ORCHESTRATOR_SESSION_LS_KEY, "0");
assert("LS Session 0 beats AppSettings ON", isChiefOrchestratorSessionEnabled() === false);

// Source allowlist / copy / no new master LS
const flagSession = readSrc("src/lib/chief-session/flag.ts");
const flagDw = readSrc("src/lib/decision-workspace-ui/flag.ts");
const settings = readSrc("src/lib/app-settings.ts");
const modal = readSrc("src/app/AdminSettingsModal.tsx");
const detail = readSrc("src/app/TenderDetailPage.tsx");
const host = readSrc("src/app/decision-workspace/DecisionWorkspaceHost.tsx");

assert("app-settings has expertAiDecydentEnabled", settings.includes("expertAiDecydentEnabled"));
assert("modal copy Expert AI · Przebieg i Decydent", modal.includes("Expert AI · Przebieg i Decydent"));
assert("modal hint kill-switch", modal.includes("Kill-switch: localStorage klucz = 0"));
assert("Session flag uses AppSettings", flagSession.includes("expertAiDecydentEnabled"));
assert("Decision flag couples Session", flagDw.includes("isChiefOrchestratorSessionEnabled"));
assert(
  "DetailPage gates Decision on Session enabled",
  detail.includes("isChiefOrchestratorSessionEnabled()") &&
    detail.includes("chiefSessionForDecision"),
);
assert("Host returns null on no_dossier", host.includes('uiPhase === "no_dossier"'));
assert("no new LS master kw-expert-ai", !flagSession.includes("kw-expert-ai") && !flagDw.includes("kw-expert-ai"));
assert(
  "public API names kept",
  flagSession.includes("export function isChiefOrchestratorSessionEnabled") &&
    flagDw.includes("export function isDecisionWorkspaceEnabled"),
);

forceChiefOrchestratorSessionForTests(null);
forceDecisionWorkspaceForTests(null);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
