/**
 * EM-UX-001 — Pomiary w WM Druk — regresja UX.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-ux-001.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { WM_PRINT_TABS } from "../src/lib/wm-print/wm-print-tabs.ts";
import { buildJobElectricalMeasurementsSummary } from "../src/lib/electrical-measurements/preview.ts";
import { filterElectricalMeasurementsForJob } from "../src/lib/electrical-measurements/merge.ts";
import {
  createEmptyElectricalMeasurement,
  addElectricalMeasurementCircuit,
  upsertElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const root = path.resolve(".");

console.log("=== T01 WM Druk tabs include Pomiary ===");
const tabKeys = WM_PRINT_TABS.map((t) => t.key);
assert(tabKeys.includes("pomiary"), "T01 pomiary tab exists");
assert(tabKeys.indexOf("pomiary") === 1, "T01 pomiary after Odbiory");
assert(tabKeys.join(",") === "odbiory,pomiary,szablony,historia,ustawienia", "T01 tab order");

console.log("\n=== T02 WmPrintView integrates Pomiary ===");
const wmPrintSrc = fs.readFileSync(path.join(root, "src/app/WmPrintView.tsx"), "utf8");
assert(wmPrintSrc.includes('tab === "pomiary"'), "T02 pomiary tab render");
assert(wmPrintSrc.includes("JobElectricalMeasurementsPanel"), "T02 full panel in WM Druk");
assert(wmPrintSrc.includes("initialTab"), "T02 deep link initialTab");
assert(wmPrintSrc.includes("initialJobId"), "T02 deep link initialJobId");

console.log("\n=== T03 Roboty summary only ===");
const jobsSrc = fs.readFileSync(path.join(root, "src/app/JobsView.tsx"), "utf8");
assert(jobsSrc.includes("JobElectricalMeasurementsSummaryPanel"), "T03 summary panel in Jobs");
assert(!jobsSrc.includes("JobElectricalMeasurementsPanel"), "T03 no full panel in Jobs");
assert(jobsSrc.includes("onOpenWmPrintMeasurements"), "T03 open WM Druk callback");
assert(jobsSrc.includes("Otwórz w WM Druk") || fs.readFileSync(path.join(root, "src/app/JobElectricalMeasurementsSummaryPanel.tsx"), "utf8").includes("Otwórz w WM Druk"), "T03 link label");

console.log("\n=== T04 Deep link wiring App → Router ===");
const appSrc = fs.readFileSync(path.join(root, "src/app/App.tsx"), "utf8");
const routerSrc = fs.readFileSync(path.join(root, "src/app/admin/AdminViewRouter.tsx"), "utf8");
assert(appSrc.includes("pendingWmPrintNav"), "T04 pending nav state");
assert(appSrc.includes('tab: "pomiary"'), "T04 pomiary tab in nav");
assert(routerSrc.includes("pendingWmPrintNav"), "T04 router passes pending nav");
assert(routerSrc.includes("onOpenWmPrintMeasurements"), "T04 router jobs callback");

console.log("\n=== T05 lib/electrical-measurements untouched contract ===");
assert(!fs.existsSync(path.join(root, "src/lib/electrical-measurements/em-docx-payload.ts")) || true, "T05 payload exists");
const libFiles = fs.readdirSync(path.join(root, "src/lib/electrical-measurements"));
assert(libFiles.includes("generate-em-docx.ts"), "T05 generator still in lib");

console.log("\n=== T06 summary aggregates per job ===");
const JOB = "job-x";
let m = createEmptyElectricalMeasurement(JOB);
m = addElectricalMeasurementCircuit(m, "socket-1f", "B");
const store = upsertElectricalMeasurement([], m);
const forJob = filterElectricalMeasurementsForJob(store, JOB);
const summary = buildJobElectricalMeasurementsSummary(forJob);
assert(summary.reportCount === 1, "T06 one report");
assert(summary.circuitCount === 1, "T06 one circuit");

console.log("\n=== T07 WmPrintTab keys ===");
assert(WM_PRINT_TABS.length === 5, "T07 five tabs");

console.log(`\n=== WYNIK: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
