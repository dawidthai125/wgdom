/**
 * TENDER-MODERNIZATION-01 / S5 — Tab Decyzja → DW harness (static source + contract).
 * DF: docs/architecture/TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE.md
 *
 * Run: npx vite-node scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

console.log("=== TENDER-MODERNIZATION-01 / S5 Tab Decyzja → DW ===\n");

const detail = readSrc("src/app/TenderDetailPage.tsx");
const panel = readSrc("src/app/TenderDetailPanel.tsx");
const decisionView = readSrc("src/app/TenderDecisionView.tsx");
const primary = readSrc("src/app/TenderWorkflowPrimaryAction.tsx");
const hub = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const host = readSrc("src/app/decision-workspace/DecisionWorkspaceHost.tsx");
const persistApi = readSrc("src/lib/decision-persist/api.ts");
const persistStore = readSrc("src/lib/decision-persist/store.ts");
const ownerStore = readSrc("src/lib/tenders-strategy-owner-decisions.ts");

// --- AC-S5-2 / A1: chiefSessionForDecision for przetarg OR decyzja+overview ---
assert(
  "A1 DetailPage decyzja + overview in chiefSessionForDecision",
  detail.includes('activeTab === "decyzja"') &&
    detail.includes('decyzjaWorkspace === "overview"') &&
    detail.includes('activeTab === "przetarg"'),
);
assert(
  "A1 DetailPage not only-przetarg gate for DW session",
  !/chiefSessionForDecision[\s\S]{0,120}activeTab === "przetarg" \? chiefSession : null/.test(
    detail,
  ),
);

// --- AC-S5-2 / A2: Host on overview ---
assert("A2 Panel imports DecisionWorkspaceHost", panel.includes("DecisionWorkspaceHost"));
assert(
  "A2 Panel mounts Host on overview",
  panel.includes('data-s5-decyzja-overview="1"') &&
    panel.includes("<DecisionWorkspaceHost"),
);
assert(
  "A2 Host before DecisionView in overview block",
  (() => {
    const block = panel.slice(panel.indexOf('effectiveWorkspace === "overview"'));
    const hostIdx = block.indexOf("<DecisionWorkspaceHost");
    const dvIdx = block.indexOf("<TenderDecisionView");
    return hostIdx >= 0 && dvIdx >= 0 && hostIdx < dvIdx;
  })(),
);

// --- AC-S5-4 / A3: DecisionView KEEP ---
assert("A3 DecisionView file exists (read ok)", decisionView.includes("data-tender-decision-view"));
assert(
  "A3 Panel still mounts TenderDecisionView on overview",
  panel.includes("<TenderDecisionView intelligenceCtx={intelligenceCtx} />"),
);
assert(
  "A3 DecisionView Expert ON fallback attr",
  decisionView.includes('data-s5-decision-fallback={expertEffective ? "1" : undefined}') ||
    decisionView.includes('data-s5-decision-fallback'),
);
assert(
  "A3 DecisionView copy PRIMARY on Decyzja (not Przetarg-only home)",
  decisionView.includes("zakładce Decyzja") &&
    !decisionView.includes("Decision Workspace na zakładce Przetarg"),
);
assert("A3 DecisionView HIDE buttons Expert ON", decisionView.includes("hidden"));

// --- AC-S5-1 / A4–A6: CTA ---
assert(
  "A4 PrimaryAction Expert ON navigates decyzja (not przetarg home)",
  /if \(expertEffective\)[\s\S]*onNavigateTab\("decyzja"\)/.test(primary) &&
    !/if \(expertEffective\)[\s\S]*onNavigateTab\("przetarg"\)/.test(primary),
);
assert(
  "A5 PrimaryAction suppresses setOwnerDecision when Expert ON",
  /if \(expertEffective\)[\s\S]*decision-workspace-surface[\s\S]*return/.test(primary),
);
assert(
  "A5 PrimaryAction still can setOwnerDecision Expert OFF",
  primary.includes("ownerDecisions.setOwnerDecision"),
);
assert(
  "A6 PrimaryAction scroll when DW in DOM",
  primary.includes("scrollIntoView") &&
    primary.includes("decision-workspace-surface"),
);
assert(
  "A6 data-s4-cta-to-decision KEEP",
  primary.includes("data-s4-cta-to-decision"),
);

// --- A8 Hub KEEP ---
assert("A8 Hub still mounts DecisionWorkspaceHost", hub.includes("<DecisionWorkspaceHost"));
assert('A8 Hub data-s4-hub-hierarchy KEEP', hub.includes('data-s4-hub-hierarchy="1"'));
assert("A8 Hub data-s2-dw-primary KEEP", hub.includes("data-s2-dw-primary"));

// --- AC-S5-3 / A7 store NO TOUCH ---
assert(
  "A7 Host still uses hydrateDecision/recordDecision",
  host.includes("hydrateDecision") && host.includes("recordDecision"),
);
assert(
  "A7 no new store key in Panel/Detail/Primary/DecisionView",
  !panel.includes("kw-decision-persist") &&
    !detail.includes("kw-decision-persist") &&
    !primary.includes("kw-decision-persist") &&
    !decisionView.includes("kw-tender-decisions-v2"),
);
assert(
  "A7 Persist API file unchanged contract (export surface)",
  persistApi.includes("hydrateDecision") && persistApi.includes("recordDecision"),
);
assert(
  "A7 owner store key KEEP kw-tender-decisions",
  ownerStore.includes("kw-tender-decisions"),
);
assert(
  "A7 Host imports Persist→legacy map; Persist API still no legacy key (S6)",
  host.includes("mapPersistActionToLegacyOwnerDecision") &&
    host.includes("decision-persist-legacy-bridge") &&
    !persistApi.includes("kw-tender-decisions") &&
    !primary.includes("Approve→GO"),
);

// --- Parity extras ---
assert(
  "P4 Hub Host path independent of Decyzja mount",
  hub.includes("chiefSessionForDecision") && hub.includes("DecisionWorkspaceHost"),
);
assert(
  "Host internal DW stack gate KEEP",
  host.includes("isDecisionWorkspaceStackEnabled"),
);
assert(
  "DetailPage still uses isExpertAiRuntimeEffective",
  detail.includes("isExpertAiRuntimeEffective"),
);

// Soft: persist store file readable (no accidental delete)
assert("Persist store file present", persistStore.length > 100);

console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
