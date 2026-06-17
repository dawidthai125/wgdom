/**
 * INSPECTOR-DESIGN-002 — Design System Alignment smoke (helper + źródła TSX).
 * Uruchom: npx vite-node scripts/test-inspector-design-002.mjs
 */
import fs from "node:fs";
import path from "node:path";
import {
  DELIVERY_PACKAGE_STATUS_BADGE_CLASS,
  DELIVERY_PACKAGE_STATUS_LABELS,
  inspectorDeliveryPackageStatusDisplay,
} from "../src/lib/inspector-handover-ux.ts";
import { applyDeliveryPackagePublication } from "../src/lib/delivery-package-publications/publication.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

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

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const JOB_ID = "job-design002";
const JOB = {
  id: JOB_ID,
  address: "ul. Design 2",
  flatNumber: "1",
  client: "WM",
  status: "in_progress",
  documents: {},
};

const FP = {
  schemaVersion: 1,
  jobId: JOB_ID,
  selectedTemplateIds: [],
  includeMeasurements: false,
  measurementId: null,
  measurementUpdatedAt: null,
  measurementReportNumber: null,
  dateMode: "today",
  customDateIso: null,
  jobVariableDigest: "jv",
  checklistDigest: "docs:",
  wmJobDocDigests: [],
  templateFileDigests: [],
  settingsDigest: "s",
};

console.log("=== D002-T01 package status — no emoji, badgeClass SSOT ===");
{
  const missing = inspectorDeliveryPackageStatusDisplay([], JOB_ID);
  assert(!("emoji" in missing), "missing status has no emoji field");
  assert(missing.ready === false, "not ready");
  assert(missing.label === DELIVERY_PACKAGE_STATUS_LABELS.missing, "BRAK label");
  assert(missing.badgeClass === DELIVERY_PACKAGE_STATUS_BADGE_CLASS.missing, "missing badgeClass");
  assert(!missing.label.includes("🟢") && !missing.label.includes("🔴"), "label plain text");

  const pubs = applyDeliveryPackagePublication({
    publications: [],
    job: JOB,
    settings: DEFAULT_WM_PRINT_SETTINGS,
    zipVersion: 1,
    publishedByUserId: "a",
    publishedByUserName: "Admin",
    fingerprintHash: "h",
    fingerprintPayload: FP,
    storagePath: "p",
    zipPublicUrl: "https://example.com/p.zip",
    fileName: "test.zip",
    fileSizeBytes: 1000,
    odbiorFileCount: 1,
    pomiaryFileCount: 0,
    includesMeasurements: false,
    manifest: [],
  }).nextPublications;
  const ready = inspectorDeliveryPackageStatusDisplay(pubs, JOB_ID);
  assert(ready.ready === true, "ready");
  assert(ready.label === DELIVERY_PACKAGE_STATUS_LABELS.ready, "GOTOWY label");
  assert(ready.badgeClass === DELIVERY_PACKAGE_STATUS_BADGE_CLASS.ready, "ready badgeClass");
  assert(ready.badgeClass.includes("border-emerald"), "success border token");
  assert(DELIVERY_PACKAGE_STATUS_BADGE_CLASS.missing.includes("border-red"), "danger border token");
}

console.log("=== D002-T02 DeliveryPackageStatusBadge component ===");
{
  const src = read("src/app/DeliveryPackageStatusBadge.tsx");
  assert(src.includes("JobListPrimaryBadge") === false, "own component");
  assert(src.includes("rounded-full font-semibold border"), "admin badge shape");
  assert(src.includes("DELIVERY_PACKAGE_STATUS_LABELS"), "uses SSOT labels");
  assert(!src.includes("🟢") && !src.includes("🔴"), "no emoji in badge component");
}

console.log("=== D002-T03 section pills — JobDetailSectionNav parity ===");
{
  const nav = read("src/app/InspectorNavigation.tsx");
  const adminNav = read("src/app/JobDetailSectionNav.tsx");
  assert(nav.includes("rounded-lg text-xs md:text-[11px]"), "inspector pills rounded-lg + admin type scale");
  assert(!nav.includes("rounded-full text-xs font-medium"), "no old rounded-full pills");
  assert(nav.includes('id === "files"') && nav.includes("bg-emerald-600 text-white"), "files active emerald like admin");
  assert(nav.includes("bg-primary text-primary-foreground"), "primary active state");
  assert(nav.includes("bg-secondary text-muted-foreground hover:text-foreground"), "secondary idle hover");
  assert(!nav.includes("uppercase tracking-wider text-muted-foreground mb-2"), "no uppercase section label");
  assert(adminNav.includes("rounded-lg text-xs md:text-[11px]"), "admin reference intact");
}

console.log("=== D002-T04 sticky header typography — JobsView parity ===");
{
  const panel = read("src/app/InspectorPanel.tsx");
  assert(panel.includes("text-base font-semibold truncate leading-tight"), "job title text-base");
  assert(panel.includes("JobListPrimaryBadge job={selectedJob}"), "primary badge in sticky");
  assert(panel.includes("DeliveryPackageStatusBadge ready={deliveryPackageStatus.ready}"), "package badge component");
  assert(!panel.includes("deliveryPackageStatus.emoji"), "no emoji render in panel");
  assert(!panel.includes("INSPECTION_PRIORITY_EMOJI"), "no priority emoji in panel");
  assert(panel.includes("text-xs text-muted-foreground truncate"), "client subtitle xs muted");
}

console.log("=== D002-T05 status badges — JobListPrimaryBadge on cards ===");
{
  const card = read("src/app/InspectorJobCard.tsx");
  assert(card.includes("JobListPrimaryBadge job={job}"), "list card uses admin badge");
  assert(!card.includes("INSPECTION_PRIORITY_EMOJI"), "no priority emoji on card");
  assert(card.includes("JobWmStageBadge job={job}"), "WM stage badge shared");
}

console.log("=== D002-T06 cards + spacing alignment ===");
{
  const panel = read("src/app/InspectorPanel.tsx");
  assert(panel.includes("space-y-4 max-w-3xl md:max-w-none"), "job scroll spacing + width like admin");
  assert(panel.includes("rounded-xl p-5 space-y-4 md:p-4 md:space-y-3"), "summary card admin padding");
  assert(!panel.includes("rounded-2xl"), "no rounded-2xl in inspector panel");
  const pkg = read("src/app/InspectorDeliveryPackagePanel.tsx");
  assert(pkg.includes("rounded-xl"), "package panel rounded-xl");
  assert(pkg.includes("DeliveryPackageStatusBadge"), "package panel shared badge");
}

console.log("=== D002-T07 header shell — neutral subtitle ===");
{
  const panel = read("src/app/InspectorPanel.tsx");
  assert(panel.includes("text-[10px] text-muted-foreground font-medium truncate\">Inspektor WM"), "neutral role subtitle");
  const dash = read("src/app/InspectorDashboard.tsx");
  assert(dash.includes("text-xl font-bold tracking-tight"), "dashboard title like admin Pulpit");
  assert(dash.includes("text-[10px] text-muted-foreground leading-tight"), "KPI labels 10px not uppercase");
}

console.log("");
console.log(`DESIGN-002 RESULT: ${passed} PASS / ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
