/**
 * NG-03.3 — Operator Action Bar: desktop slot, mobile sticky, no Command Layer dup.
 * npx vite-node scripts/test-ng-03-3-action-bar.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tenderOperatorCanAnalyze } from "../src/app/TenderWorkflowOperatorActionBar.tsx";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

console.log("=== NG-03.3 OPERATOR ACTION BAR ===\n");

console.log("1. canAnalyze helper");
ok("noticeNumber", tenderOperatorCanAnalyze({ id: "t", title: "", status: "seen", updatedAt: "", noticeNumber: "BZP-1" }));
ok(
  "bzp docs",
  tenderOperatorCanAnalyze({
    id: "t",
    title: "",
    status: "seen",
    updatedAt: "",
    tenderId: "x",
    bzpDocuments: [{ name: "a.pdf", url: "u" }],
  }),
);
ok(
  "empty",
  !tenderOperatorCanAnalyze({ id: "t", title: "", status: "seen", updatedAt: "" }),
);

console.log("\n2. Component SSOT");
const bar = readFileSync(resolve(root, "src/app/TenderWorkflowOperatorActionBar.tsx"), "utf8");
ok("marker", bar.includes("data-tender-operator-action-bar"));
ok("upload", bar.includes("Wgraj SWZ") || bar.includes("Upload"));
ok("analiza", bar.includes("Analiza"));
ok("ezamowienia", bar.includes("e-Zamówienia"));
ok("eksport", bar.includes("Eksport") || bar.includes("exportSummaryPdf"));
ok("no kpi", !bar.includes("Kpi") && !bar.includes("TrustChip"));
ok("no cta", !bar.includes("PrimaryAction") && !bar.includes("WorkflowPrimary"));

console.log("\n3. Page layout");
const page = readFileSync(resolve(root, "src/app/TenderDetailPage.tsx"), "utf8");
ok("desktop slot", page.includes('data-tender-operator-action-bar-slot="desktop"'));
ok("mobile sticky slot", page.includes('data-tender-operator-action-bar-slot="mobile"'));
ok("desktop hidden on mobile", page.includes("hidden sm:block"));
ok("mobile sm:hidden sticky", page.includes("sm:hidden sticky bottom-0"));
ok("content pb mobile", page.includes("max-sm:pb-[calc(4.75rem"));
ok("under command layer order", page.indexOf("TenderDetailCommandLayer") < page.indexOf("operator-action-bar-slot=\"desktop\""));
ok("onOperatorActionBarChange", page.includes("onOperatorActionBarChange"));

console.log("\n4. Dedup operator section");
const op = readFileSync(resolve(root, "src/app/TenderWorkflowOperatorSection.tsx"), "utf8");
const panel = readFileSync(resolve(root, "src/app/TenderDetailPanel.tsx"), "utf8");
const bid = readFileSync(resolve(root, "src/app/TenderBidPrepPanel.tsx"), "utf8");
ok("hideInlineActions", op.includes("hideInlineActions"));
ok("hideBidPrepHeaderActions", op.includes("hideBidPrepHeaderActions"));
ok("panel wires hide flags", panel.includes("hideInlineActions={embedV4CommandLayerActive}"));
ok("bid prep hideHeaderActions", bid.includes("hideHeaderActions"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
