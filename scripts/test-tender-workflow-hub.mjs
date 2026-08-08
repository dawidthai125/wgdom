/**
 * EPIC A — Workflow Hub: Przetarg vs Decyzja (odpowiedzialność ekranów).
 * npx vite-node scripts/test-tender-workflow-hub.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TENDER_WORKFLOW_HUB_EMBED_WORKSPACE,
  isTenderEmbedV4WorkspaceId,
} from "../src/lib/tender-workspace-ux.ts";

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

console.log("\n=== EPIC A — Workflow Hub ===\n");

console.log("1. SSOT embed workspace");
assert(TENDER_WORKFLOW_HUB_EMBED_WORKSPACE === "workflow-hub", "workflow-hub constant");
assert(isTenderEmbedV4WorkspaceId("workflow-hub"), "isTenderEmbedV4WorkspaceId hub");
assert(isTenderEmbedV4WorkspaceId("overview"), "isTenderEmbedV4WorkspaceId overview");
assert(!isTenderEmbedV4WorkspaceId("fake"), "reject fake embed id");

console.log("\n2. Przetarg — Workflow Hub components");
const hubPanel = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const hubSections = readSrc("src/app/TenderWorkflowHubSections.tsx");
const przetarg = readSrc("src/app/TenderPrzetargWorkspace.tsx");
const operator = readSrc("src/app/TenderWorkflowOperatorSection.tsx");
assert(hubPanel.includes("data-tender-workflow-hub"), "hub panel marker");
const v2Panel = readSrc("src/app/TenderWorkspaceV2Panel.tsx");
assert(hubPanel.includes("TenderWorkspaceV2Panel"), "hub: progress V2 panel");
assert(hubPanel.includes("intelligenceCtx={intelligenceCtx}"), "hub: passes intelligenceCtx to V2");
assert(!v2Panel.includes("buildTenderIntelligenceNextAction"), "V2: no duplicate intelligence next-action builder");
assert(!v2Panel.includes("buildTenderIntelligenceContext"), "V2: no duplicate intelligence build");
assert(hubPanel.includes("TenderWorkflowProcessStrip"), "hub: EPIC B process strip");
assert(hubPanel.includes("TenderWorkflowPrimaryAction"), "hub: EPIC C primary CTA");
assert(hubPanel.includes("TrustChipRow"), "hub: trust chip row (HF-001)");
assert(!hubPanel.includes("WorkflowHubPrepStatusDisplay"), "hub: no prep status duplicate (HF-001)");
assert(hubPanel.includes("shouldRenderHubTrustBanner"), "hub: conditional trust banner (HF-001)");
assert(hubSections.includes("WorkflowHubBlockersSection"), "hub: blockers section");
assert(hubSections.includes("WorkflowHubPositionsFileDisplay"), "hub: positions file");
assert(operator.includes("TenderBidPrepPanel"), "hub: operator bid prep");
assert(operator.includes("TenderAnalysisStatusStrip"), "hub: analysis strip");
assert(przetarg.includes("TenderWorkflowHubPanel"), "przetarg uses hub panel");

console.log("\n3. Decyzja — decision-only view (SSOT: TenderDecisionView)");
const decision = readSrc("src/app/TenderDecisionView.tsx");
assert(decision.includes("data-tender-decision-view"), "decision view marker");
assert(decision.includes("TenderOwnerDecisionButtons"), "decision: GO/HOLD/NO-GO");
assert(decision.includes("intelligenceCtx"), "decision: intelligenceCtx prop (Decyzja SSOT)");
assert(!decision.includes("WorkflowHubBlockersSection"), "decision: no blockers");
assert(!decision.includes("TenderWorkspaceV2Panel"), "decision: no V2 progress");
assert(!decision.includes("TenderBidPrepPanel"), "decision: no bid prep");
assert(!decision.includes("scoreTenderForOwnerView"), "decision: no scoring in Decyzja view");

console.log("\n4. Panel wiring");
const panel = readSrc("src/app/TenderDetailPanel.tsx");
const page = readSrc("src/app/TenderDetailPage.tsx");
assert(panel.includes("TENDER_WORKFLOW_HUB_EMBED_WORKSPACE"), "panel: hub workspace");
assert(panel.includes("TenderPrzetargWorkspace"), "panel: przetarg workspace");
assert(panel.includes("TenderDecisionView"), "panel: decision view on overview");
assert(!panel.includes("TenderOwnerView"), "panel: no TenderOwnerView consumer");
assert(!panel.includes("ownerMoreContext"), "panel: no duplicated analysis strip in decyzja");
assert(page.includes("TENDER_WORKFLOW_HUB_EMBED_WORKSPACE"), "page: przetarg → hub embed");
assert(page.includes("onEmbedV4TabNavigate"), "page: V4 tab nav for hub");

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
