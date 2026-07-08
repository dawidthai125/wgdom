/**
 * NG-08-03 — Workspace Intelligence (WF-03 · REC-1).
 * npx vite-node scripts/test-tender-workspace-intelligence-ng08-03.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIntelligenceHubShortcutLabel } from "../src/lib/tender-command-layer-ux.ts";

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

console.log("\n=== NG-08-03 — Workspace Intelligence (WF-03) ===\n");

const v2Panel = readSrc("src/app/TenderWorkspaceV2Panel.tsx");
const hubPanel = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const detailPage = readSrc("src/app/TenderDetailPage.tsx");
const commandUx = readSrc("src/lib/tender-command-layer-ux.ts");
const intelCtx = readSrc("src/lib/tender-intelligence-context.ts");
const stripLib = readSrc("src/lib/tender-workflow-process-strip.ts");

console.log("T1 — TenderWorkspaceV2InsightsCompact export");
assert(/export function TenderWorkspaceV2InsightsCompact/.test(v2Panel), "InsightsCompact exported");

console.log("\nT2 — anchor id tender-intelligence-hub w hub panel");
assert(hubPanel.includes('id="tender-intelligence-hub"') || v2Panel.includes('id="tender-intelligence-hub"'),
  "tender-intelligence-hub anchor present");

console.log("\nT3 — data-tender-intelligence-shortcut w TenderDetailPage");
assert(detailPage.includes("data-tender-intelligence-shortcut"), "shortcut data attr in detail page");
assert(detailPage.includes("handleIntelligenceShortcutClick"), "shortcut handler wired");

console.log("\nT4 — buildIntelligenceHubShortcutLabel SSOT");
assert(typeof buildIntelligenceHubShortcutLabel === "function", "helper exported");
assert(buildIntelligenceHubShortcutLabel() === "Podsumowanie oferty", "frozen label copy");
assert(commandUx.includes("buildIntelligenceHubShortcutLabel"), "helper in command-layer-ux");

console.log("\nT5 — skipInsightsSection prop");
assert(v2Panel.includes("skipInsightsSection"), "skipInsightsSection prop defined");
assert(hubPanel.includes("skipInsightsSection={commandLayerActive}"), "hub passes skipInsightsSection");

console.log("\nT6 — hub mount między progress compact a accordion");
const progressIdx = hubPanel.indexOf("TenderWorkspaceV2ProgressCompact");
const insightsIdx = hubPanel.indexOf("TenderWorkspaceV2InsightsCompact");
const accordionIdx = hubPanel.indexOf('id="tender-progress-accordion"');
assert(progressIdx > -1 && insightsIdx > progressIdx, "insights after progress compact");
assert(accordionIdx > insightsIdx, "accordion after insights hub");

console.log("\nT7 — buildWorkspaceV2Insights w insights compact");
const insightsFnStart = v2Panel.indexOf("export function TenderWorkspaceV2InsightsCompact");
const insightsFnEnd = v2Panel.indexOf("function docIcon", insightsFnStart);
const insightsBlock = v2Panel.slice(insightsFnStart, insightsFnEnd);
assert(insightsBlock.includes("buildWorkspaceV2Insights"), "insights compact uses SSOT builder");

console.log("\nT8 — brak overlay.displayLabel w insights compact");
assert(!insightsBlock.includes("displayLabel"), "no verdict overlay in hub");
assert(!insightsBlock.includes("overlay.displayLabel"), "no overlay.displayLabel in hub");

console.log("\nT9 — forbidden: tender-intelligence-context.ts unchanged semantics");
assert(!intelCtx.includes("NG-08-03"), "no NG-08-03 markers in intelligence context");

console.log("\nT10 — forbidden: tender-workflow-process-strip.ts no NG-08-03 diff");
assert(!stripLib.includes("NG-08-03"), "no NG-08-03 markers in process strip");
assert(!stripLib.includes("tender-intelligence-hub"), "strip not remapped to intelligence hub");

console.log(`\n=== WYNIK: ${pass} PASS / ${fail} FAIL ===\n`);
if (fail > 0) process.exit(1);
