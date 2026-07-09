/**
 * NG-08-05 — Cost Workspace (WF-05 · REC-1).
 * npx vite-node scripts/test-tender-workspace-cost-ng08-05.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TENDER_COST_SCROLL_KEY_PREFIX,
  loadTenderTabScrollTop,
  saveTenderTabScrollTop,
  tenderCostScrollKey,
} from "../src/lib/tender-cost-ui-persist.ts";
import {
  buildCostWorkspaceShortcutLabel,
  resolveSuggestedCostV4Tab,
} from "../src/lib/tender-command-layer-ux.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

let pass = 0;
let fail = 0;
function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("\n=== NG-08-05 — Cost Workspace (WF-05) ===\n");

const bridge = readSrc("src/app/TenderCostWorkspaceBridge.tsx");
const kosztorys = readSrc("src/app/TenderKosztorysWorkspace.tsx");
const bidPanel = readSrc("src/app/TenderBidProposalPanel.tsx");
const detailPage = readSrc("src/app/TenderDetailPage.tsx");
const v2Panel = readSrc("src/app/TenderWorkspaceV2Panel.tsx");
const hubPanel = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const commandUx = readSrc("src/lib/tender-command-layer-ux.ts");
const persist = readSrc("src/lib/tender-cost-ui-persist.ts");
const phaseLib = readSrc("src/lib/tender-kosztorys-process-phase.ts");
const stripLib = readSrc("src/lib/tender-workflow-process-strip.ts");
const cloudSync = readSrc("src/lib/cloud-sync.ts");

console.log("T1 — TenderCostWorkspaceBridge export + marker");
assert(bridge.includes("export function TenderCostWorkspaceBridge"), "bridge exported");
assert(bridge.includes("data-tender-cost-workspace-bridge"), "bridge data attr");

console.log("\nT2 — bridge mounts");
assert(kosztorys.includes("TenderCostWorkspaceBridge"), "bridge in kosztorys");
assert(bidPanel.includes("TenderCostWorkspaceBridge"), "bridge in bid panel");

console.log("\nT3 — resolveSuggestedCostV4Tab + label helper");
assert(commandUx.includes("export function resolveSuggestedCostV4Tab"), "resolve exported");
assert(commandUx.includes("export function buildCostWorkspaceShortcutLabel"), "label exported");
assert(resolveSuggestedCostV4Tab({ id: "t1", title: "", status: "seen", updatedAt: "" }) === "kosztorys", "default kosztorys");
assert(
  resolveSuggestedCostV4Tab({
    id: "t2",
    title: "",
    status: "seen",
    updatedAt: "",
    tenderDossier: { kosztorys: { ok: true } },
  }) === "ceny",
  "kosztorys.ok → ceny",
);
assert(buildCostWorkspaceShortcutLabel("ceny") === "Wycena oferty", "ceny label");

console.log("\nT4 — CostShortcutChip in TenderDetailPage");
assert(detailPage.includes("data-tender-cost-shortcut"), "cost shortcut chip");
assert(detailPage.includes("resolveSuggestedCostV4Tab"), "resolve in detail page");

console.log("\nT5 — hub cost row");
assert(v2Panel.includes("data-tender-hub-cost-row"), "hub cost row marker");
assert(hubPanel.includes("onNavigateCostTab"), "hub wiring");

console.log("\nT6 — TenderBidProposalPanel zero text-[9px]");
assert(!bidPanel.includes("text-[9px]"), "no text-[9px] in bid panel");

console.log("\nT7 — tender-cost-ui-persist key");
assert(persist.includes(TENDER_COST_SCROLL_KEY_PREFIX), "scroll prefix");
assert(TENDER_COST_SCROLL_KEY_PREFIX === "wg-tender-scroll-", "prefix frozen");
assert(tenderCostScrollKey("abc", "kosztorys") === "wg-tender-scroll-abc-kosztorys", "key builder");
assert(loadTenderTabScrollTop(undefined, "kosztorys") === null, "no-op without tenderId");
if (typeof localStorage !== "undefined") {
  saveTenderTabScrollTop("test-tender-ng08-05", "ceny", 120);
  assert(loadTenderTabScrollTop("test-tender-ng08-05", "ceny") === 120, "round-trip save/load");
  try {
    localStorage.removeItem(tenderCostScrollKey("test-tender-ng08-05", "ceny"));
  } catch {
    /* ignore */
  }
} else {
  assert(persist.includes("JSON.stringify"), "save serializes scrollTop (node static)");
}
assert(detailPage.includes("data-tender-detail-scroll-root"), "scroll root marker");
assert(detailPage.includes("tender-cost-ui-persist"), "scroll persist wired");

console.log("\nT8 — forbidden: deriveKosztorysProcessPhase body");
const phaseFn = phaseLib.indexOf("export function deriveKosztorysProcessPhase");
const phaseEnd = phaseLib.indexOf("\nexport function", phaseFn + 1);
const phaseBody = phaseLib.slice(phaseFn, phaseEnd > phaseFn ? phaseEnd : phaseFn + 4000);
assert(!phaseBody.includes("NG-08-05"), "no NG-08-05 in phase fn");

console.log("\nT9 — forbidden: tender-workflow-process-strip.ts");
assert(!stripLib.includes("NG-08-05"), "no NG-08-05 in process strip");

console.log("\nT10 — forbidden: cloud-sync.ts");
assert(!cloudSync.includes("NG-08-05"), "no NG-08-05 in cloud-sync");

console.log("\nT11 — IntelligenceShortcutChip handler unchanged");
assert(detailPage.includes("pendingIntelligenceScroll"), "intelligence scroll pending");
assert(detailPage.includes("scrollToIntelligenceHub"), "intelligence scroll helper");
assert(detailPage.includes("data-tender-intelligence-shortcut"), "intelligence chip marker");

console.log(`\n=== WYNIK: ${pass} PASS / ${fail} FAIL ===\n`);
if (fail > 0) process.exit(1);
