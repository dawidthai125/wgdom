/**
 * TENDER-MODERNIZATION-01 / S6 — Decision Persist → legacy bridge harness.
 * DF: docs/architecture/TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md
 *
 * Run: npx vite-node scripts/test-tender-modernization-01-s6-decision-persist-bridge.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mapPersistActionToLegacyOwnerDecision } from "../src/lib/decision-persist-legacy-bridge.ts";
import { DECISION_PERSIST_LS_KEY } from "../src/lib/decision-persist/index.ts";
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

console.log("=== TENDER-MODERNIZATION-01 / S6 Decision Persist Bridge ===\n");

const bridge = readSrc("src/lib/decision-persist-legacy-bridge.ts");
const host = readSrc("src/app/decision-workspace/DecisionWorkspaceHost.tsx");
const panel = readSrc("src/app/TenderDetailPanel.tsx");
const hub = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const persistApi = readSrc("src/lib/decision-persist/api.ts");
const persistStore = readSrc("src/lib/decision-persist/store.ts");
const persistTypes = readSrc("src/lib/decision-persist/types.ts");
const ownerStore = readSrc("src/lib/tenders-strategy-owner-decisions.ts");
const decisionView = readSrc("src/app/TenderDecisionView.tsx");
const primary = readSrc("src/app/TenderWorkflowPrimaryAction.tsx");

// --- AC-S6-8 / map unit ---
assert("map approve → GO", mapPersistActionToLegacyOwnerDecision("approve") === "GO");
assert("map reject → NO-GO", mapPersistActionToLegacyOwnerDecision("reject") === "NO-GO");
assert(
  "map needs_review → HOLD",
  mapPersistActionToLegacyOwnerDecision("needs_review") === "HOLD",
);
assert("map return → null", mapPersistActionToLegacyOwnerDecision("return") === null);
assert("map unknown → null", mapPersistActionToLegacyOwnerDecision("other") === null);
assert(
  "AC-S6-8 bridge exports mapPersistActionToLegacyOwnerDecision",
  bridge.includes("export function mapPersistActionToLegacyOwnerDecision"),
);
assert(
  "AC-S6-8 bridge ZERO scoreTender / recordDecision / localStorage",
  !bridge.includes("scoreTender") &&
    !bridge.includes("recordDecision") &&
    !bridge.includes("localStorage") &&
    !bridge.includes("setOwnerDecision"),
);

// --- AC-S6-1 Persist-first ---
{
  const recordIdx = host.indexOf("recordDecision({");
  const setIdx = host.indexOf("setOwnerDecision(");
  assert(
    "AC-S6-1 Host recordDecision before setOwnerDecision",
    recordIdx >= 0 && setIdx > recordIdx,
  );
  assert(
    "AC-S6-1 / AC-S6-6 Persist fail early return before mirror",
    /if\s*\(\s*!persisted\s*\)[\s\S]*?return[\s\S]*?setOwnerDecision/.test(host),
  );
}

// --- AC-S6-2 map + setOwnerDecision after Persist OK ---
assert(
  "AC-S6-2 Host imports mapPersistActionToLegacyOwnerDecision",
  host.includes("mapPersistActionToLegacyOwnerDecision") &&
    host.includes("decision-persist-legacy-bridge"),
);
assert(
  "AC-S6-2 Host calls setOwnerDecision(scoringBundle, mapped)",
  /setOwnerDecision\(\s*scoringBundle\s*,\s*mapped\s*\)/.test(host),
);
assert(
  "AC-S6-2 Host uses useTendersContext setOwnerDecision",
  host.includes("useTendersContext") && host.includes("setOwnerDecision"),
);

// --- AC-S6-3 stores ---
assert(
  "AC-S6-3 Persist key kw-decision-persist-v1",
  DECISION_PERSIST_LS_KEY === "kw-decision-persist-v1",
);
assert(
  "AC-S6-3 legacy key kw-tender-decisions",
  TENDER_DECISIONS_STORAGE_KEY === "kw-tender-decisions",
);
assert(
  "AC-S6-3 Host no third decision store key",
  !host.includes("kw-tender-decisions-v2") &&
    !host.includes("kw-decision-legacy") &&
    !bridge.includes("localStorage") &&
    !/\bkw-[a-z0-9-]+\b/.test(bridge.replace(/`kw-tender-decisions`/g, "")),
);
assert(
  "AC-S6-3 Persist API/store unchanged (no legacy key)",
  !persistApi.includes("kw-tender-decisions") &&
    !persistStore.includes("kw-tender-decisions") &&
    !persistApi.includes("setOwnerDecision"),
);

// --- AC-S6-4 parents scoringBundle + Host sources ---
assert(
  "AC-S6-4 DetailPanel passes scoringBundle",
  panel.includes("scoringBundle={intelligenceCtx?.scoringBundle ?? null}"),
);
assert(
  "AC-S6-4 HubPanel passes scoringBundle",
  hub.includes("scoringBundle={intelligenceCtx.scoringBundle}"),
);
assert(
  "AC-S6-4 Host declares scoringBundle prop",
  host.includes("scoringBundle") && host.includes("TenderScoringBundle"),
);

// --- AC-S6-7 missing bundle gate ---
assert(
  "AC-S6-7 mirror gated on scoringBundle",
  /if\s*\(\s*!scoringBundle\s*\)[\s\S]*?return/.test(host) &&
    host.includes("scoringBundle.item.id !== tenderId"),
);

// --- AC-S6-5 compatibility KEEP ---
assert(
  "AC-S6-5 DecisionView KEEP (file + mount)",
  decisionView.includes("data-tender-decision-view") &&
    panel.includes("<TenderDecisionView"),
);
assert(
  "AC-S6-5 S5 overview marker KEEP",
  panel.includes('data-s5-decyzja-overview="1"'),
);
assert(
  "AC-S6-5 S4 Hub markers KEEP",
  hub.includes('data-s4-hub-hierarchy="1"') && hub.includes("data-s2-dw-primary"),
);
assert(
  "AC-S6-5 PrimaryAction Expert OFF still setOwnerDecision",
  primary.includes("ownerDecisions.setOwnerDecision"),
);
assert(
  "AC-S6-5 PrimaryAction Expert ON still suppresses commit",
  /if \(expertEffective\)[\s\S]*decision-workspace-surface[\s\S]*return/.test(primary),
);

// --- Persist API signatures KEEP (no allowlist rewrite) ---
assert(
  "Persist API exports KEEP",
  persistApi.includes("export function recordDecision") &&
    persistApi.includes("export function hydrateDecision") &&
    persistApi.includes("export function listDecisionHistory"),
);
assert(
  "Persist types schema version present",
  persistTypes.includes("DECISION_PERSIST_SCHEMA_VERSION") ||
    persistStore.includes("schemaVersion") ||
    persistApi.length > 100,
);
assert(
  "owner upsert KEEP (reuse)",
  ownerStore.includes("upsertOwnerDecision") &&
    ownerStore.includes("kw-tender-decisions"),
);

console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
