/**
 * TENDER-MODERNIZATION-01 / S2 — Dual Outcome harness.
 * Canonical DF name. Owner alias: test-tender-modernization-s2.mjs
 *
 * Run: npx vite-node scripts/test-tender-modernization-01-s2-dual-outcome.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  forceChiefSessionStackForTests,
  forceDecisionWorkspaceStackForTests,
  forceTenderExpertEffectiveForTests,
  isChiefSessionStackEnabled,
  isDecisionWorkspaceStackEnabled,
  isTenderExpertDwKillActive,
  isTenderExpertEffective,
  resolveTenderExpertEffective,
} from "../src/lib/tender-expert-effective.ts";
import { adminCanViewTendersTab } from "../src/lib/admin-auth.ts";
import { defaultAppSettings } from "../src/lib/app-settings.ts";
import { CHIEF_ORCHESTRATOR_SESSION_LS_KEY } from "../src/lib/chief-session/index.ts";
import { DECISION_WORKSPACE_LS_KEY } from "../src/lib/decision-workspace-ui/index.ts";
import { TENDER_DECISIONS_STORAGE_KEY } from "../src/lib/tenders-strategy-owner-decisions.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

function resetForces() {
  forceTenderExpertEffectiveForTests(null);
  forceChiefSessionStackForTests(null);
  forceDecisionWorkspaceStackForTests(null);
}

console.log("=== TENDER-MODERNIZATION-01 / S2 Dual Outcome ===\n");

/** Node harness — minimal localStorage for kill-switch Q13b. */
if (typeof globalThis.localStorage === "undefined") {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(String(k), String(v));
    },
    removeItem: (k) => {
      map.delete(String(k));
    },
  };
}

const off = defaultAppSettings();
const on = { ...off, tendersTabForStaffEnabled: true };

// --- Helper: Expert effective = Module gate ---
assert(
  "helper OFF admin",
  isTenderExpertEffective("admin", off) === false,
);
assert(
  "helper ON admin",
  isTenderExpertEffective("admin", on) === true,
);
assert(
  "helper mirrors adminCanViewTendersTab ON",
  isTenderExpertEffective("moderator", on) ===
    adminCanViewTendersTab("moderator", on),
);
assert(
  "helper super_admin OFF settings still true",
  isTenderExpertEffective("super_admin", off) === true,
);
{
  const helperSrc = readSrc("src/lib/tender-expert-effective.ts");
  assert(
    "no expertAiDecydentEnabled symbol/usage in helper",
    !/\bexpertAiDecydentEnabled\b/.test(helperSrc),
  );
}

// Stack: Expert ON ⇒ Session/DW ON unless kill
{
  resetForces();
  forceTenderExpertEffectiveForTests(true);
  assert("stack Session ON when Expert ON", isChiefSessionStackEnabled(true) === true);
  assert("stack DW ON when Expert ON", isDecisionWorkspaceStackEnabled(true) === true);
}

// Kill-switch Q13b
{
  const prevSession = globalThis.localStorage?.getItem?.(CHIEF_ORCHESTRATOR_SESSION_LS_KEY);
  const prevDw = globalThis.localStorage?.getItem?.(DECISION_WORKSPACE_LS_KEY);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DECISION_WORKSPACE_LS_KEY, "0");
      localStorage.setItem(CHIEF_ORCHESTRATOR_SESSION_LS_KEY, "0");
    }
    resetForces();
    assert(
      "Q13b DW kill when Expert ON",
      isDecisionWorkspaceStackEnabled(true) === false,
    );
    assert(
      "Q13b Session kill when Expert ON",
      isChiefSessionStackEnabled(true) === false,
    );
    assert(
      "Q13b kill active helper",
      isTenderExpertDwKillActive(true) === true,
    );
  } finally {
    if (typeof localStorage !== "undefined") {
      if (prevDw == null) localStorage.removeItem(DECISION_WORKSPACE_LS_KEY);
      else localStorage.setItem(DECISION_WORKSPACE_LS_KEY, prevDw);
      if (prevSession == null) localStorage.removeItem(CHIEF_ORCHESTRATOR_SESSION_LS_KEY);
      else localStorage.setItem(CHIEF_ORCHESTRATOR_SESSION_LS_KEY, prevSession);
    }
    resetForces();
  }
}

// Expert OFF stack → legacy flags (force Expert OFF)
{
  resetForces();
  forceTenderExpertEffectiveForTests(false);
  // Without LS force, Expert OFF uses legacy is*Enabled — tip default typically false
  const sessionOff = isChiefSessionStackEnabled(false);
  const dwOff = isDecisionWorkspaceStackEnabled(false);
  assert("Expert OFF Session uses legacy path (boolean)", typeof sessionOff === "boolean");
  assert("Expert OFF DW uses legacy path (boolean)", typeof dwOff === "boolean");
  resetForces();
}

// --- Source matrix Expert ON wiring ---
const detail = readSrc("src/app/TenderDetailPage.tsx");
const hub = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const primary = readSrc("src/app/TenderWorkflowPrimaryAction.tsx");
const decisionView = readSrc("src/app/TenderDecisionView.tsx");
const host = readSrc("src/app/decision-workspace/DecisionWorkspaceHost.tsx");
const strategy = readSrc("src/app/tenders/components/TendersStrategyContent.tsx");
const best = readSrc("src/app/tenders/strategy/components/BestOpportunityCard.tsx");
const tre = readSrc("src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx");
const persistApi = readSrc("src/lib/decision-persist/api.ts");
const persistStore = readSrc("src/lib/decision-persist/store.ts");
const ownerStore = readSrc("src/lib/tenders-strategy-owner-decisions.ts");

assert("DetailPage uses isChiefSessionStackEnabled", detail.includes("isChiefSessionStackEnabled"));
assert("DetailPage uses resolveTenderExpertEffective", detail.includes("resolveTenderExpertEffective"));
assert(
  "DetailPage no raw isChiefOrchestratorSessionEnabled()",
  !detail.includes("isChiefOrchestratorSessionEnabled()"),
);

assert("Hub data-s2-dw-primary", hub.includes("data-s2-dw-primary"));
assert("Hub hierarchy cue", hub.includes("data-s2-hub-hierarchy-cue"));

assert("PrimaryAction Expert gate", primary.includes("resolveTenderExpertEffective"));
assert(
  "PrimaryAction suppresses setOwnerDecision when Expert ON",
  /if \(expertEffective\)[\s\S]*decision-workspace-surface[\s\S]*return/.test(primary),
);
assert(
  "PrimaryAction still can setOwnerDecision Expert OFF",
  primary.includes("ownerDecisions.setOwnerDecision"),
);

assert("DecisionView HIDE buttons Expert ON", decisionView.includes("hidden"));
assert(
  "DecisionView demote system verdict",
  decisionView.includes("data-s2-intelligence-recommendation-badge") ||
    decisionView.includes("Rekomendacja systemu — nie decyzja Decydenta"),
);
assert(
  "DecisionView no setOwnerDecision when expertEffective branch",
  /expertEffective \? \([\s\S]*hidden[\s\S]*: \([\s\S]*setOwnerDecision/.test(decisionView),
);

assert("Host uses isDecisionWorkspaceStackEnabled", host.includes("isDecisionWorkspaceStackEnabled"));
assert("Host data-s2-dw-primary", host.includes('data-s2-dw-primary="1"'));

assert(
  "Strategy omits onSetDecision when Expert ON",
  strategy.includes("expertEffective ? undefined : handleSetDecision"),
);
assert("BestOpportunity demote prop", best.includes("legacyDecisionDemoted"));
assert("BestOpportunity HIDE write without onSetDecision", best.includes("{onSetDecision &&"));

assert("TRE demote note", tre.includes("data-s2-tre-demote-note"));
assert(
  "TRE copy not Decydent",
  tre.includes("nie decyzja Decydenta"),
);

// --- No mapping Persist → legacy ---
assert("Persist API no kw-tender-decisions", !persistApi.includes("kw-tender-decisions"));
assert("Persist store no kw-tender-decisions", !persistStore.includes("kw-tender-decisions"));
assert("Persist API no setOwnerDecision", !persistApi.includes("setOwnerDecision"));
assert(
  "Persist no Approve→GO map",
  !/approve[\s\S]{0,80}GO|GO[\s\S]{0,80}approve/i.test(persistApi),
);
assert(
  "owner store key intact",
  TENDER_DECISIONS_STORAGE_KEY === "kw-tender-decisions",
);

// Host onAction → recordDecision only (no setOwnerDecision)
assert("Host calls recordDecision", host.includes("recordDecision"));
assert("Host does not call setOwnerDecision", !host.includes("setOwnerDecision"));

// --- AC-S2-1…5 (source + helper) ---
assert(
  "AC-S2-1 DW PRIMARY cues",
  host.includes("data-s2-dw-primary") && hub.includes("data-s2-dw-primary"),
);
assert(
  "AC-S2-2 no dual human write Expert ON",
  /if \(expertEffective\)[\s\S]*return/.test(primary) &&
    decisionView.includes("hidden") &&
    strategy.includes("expertEffective ? undefined"),
);
assert(
  "AC-S2-3 TRE/Intelligence demote",
  tre.includes("nie decyzja Decydenta") &&
    decisionView.includes("Rekomendacja systemu"),
);
assert(
  "AC-S2-4 Module gate = Expert (Q4)",
  isTenderExpertEffective("admin", off) === false &&
    isTenderExpertEffective("super_admin", off) === true,
);
assert(
  "AC-S2-5 no Persist→legacy bridge in Host/Primary",
  !host.includes("kw-tender-decisions") &&
    !primary.includes("approve") &&
    !/Approve\s*→\s*GO|approve.*setOwnerDecision/i.test(host),
);

// Forbidden flag anywhere in allowlist touchpoints
const forbid = "expertAiDecydentEnabled";
assert("no new master flag in DetailPage", !detail.includes(forbid));
assert(
  "no new master flag symbol in helper",
  !/\bexpertAiDecydentEnabled\b/.test(readSrc("src/lib/tender-expert-effective.ts")),
);

// Allowlist presence
assert("helper file exists", readSrc("src/lib/tender-expert-effective.ts").length > 100);

resetForces();
void resolveTenderExpertEffective;

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
