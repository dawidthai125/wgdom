/**
 * NG-03.2 — Command Layer: KPI Compact, Status Ribbon, CTA in chrome, accordions.
 * npx vite-node scripts/test-ng-03-2-command-layer.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildKpiBarCompactCells,
  buildKpiBarExtendedCells,
  buildKpiBarProCells,
  KPI_COMPACT_CELL_LABELS,
} from "../src/lib/tender-detail-v4-display.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const item = {
  id: "t1",
  title: "Test",
  status: "seen",
  updatedAt: "",
};

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

console.log("=== NG-03.2 COMMAND LAYER ===\n");

console.log("1. KPI Compact SSOT");
const compact = buildKpiBarCompactCells(item, null);
const extended = buildKpiBarExtendedCells(item, null);
const full = buildKpiBarProCells(item, null);
ok("compact count === 4", compact.length === 4);
ok(
  "compact labels",
  compact.every((c) => KPI_COMPACT_CELL_LABELS.includes(c.label)),
);
ok("full = compact + extended", full.length === compact.length + extended.length);

console.log("\n2. UI wiring");
const page = readFileSync(resolve(root, "src/app/TenderDetailPage.tsx"), "utf8");
const cmd = readFileSync(resolve(root, "src/app/TenderDetailCommandLayer.tsx"), "utf8");
const ribbon = readFileSync(resolve(root, "src/app/TenderStatusRibbon.tsx"), "utf8");
const hub = readFileSync(resolve(root, "src/app/TenderWorkflowHubPanel.tsx"), "utf8");
const przetarg = readFileSync(resolve(root, "src/app/TenderPrzetargWorkspace.tsx"), "utf8");
ok("page uses CommandLayer", page.includes("TenderDetailCommandLayer"));
ok("page StatusRibbon in command slot", page.includes("TenderStatusRibbon"));
ok("page PrimaryAction in command slot", page.includes("TenderWorkflowPrimaryAction"));
ok("page no full KpiBar in chrome", !page.includes("TenderDetailKpiBar"));
ok("command layer marker", cmd.includes("data-tender-command-layer"));
ok("kpi compact in command", cmd.includes("TenderDetailKpiCompact"));
ok("ribbon marker", ribbon.includes("data-tender-status-ribbon"));
ok("ribbon compact density", ribbon.includes("data-tender-ribbon-density"));
ok("ribbon process strip variant", ribbon.includes('variant="ribbon"'));
ok("analysis strip w hub nie ribbon", !ribbon.includes("TenderAnalysisStatusStrip") && hub.includes("TenderAnalysisStatusStrip"));
ok("hub commandLayerActive gate", hub.includes("commandLayerActive"));
ok("v2 accordion default", hub.includes("data-tender-progress-accordion"));
ok("info accordion", przetarg.includes("data-tender-info-accordion"));
ok("full kpi in info accordion", przetarg.includes("TenderDetailKpiBar"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
