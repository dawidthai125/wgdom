/**
 * INSPECTOR-UX-002 — Quick Wins — testy helperów UX (status, quick actions, kolejność pakietu).
 * Uruchom: npx vite-node scripts/test-inspector-ux-002.mjs
 */
import {
  INSPECTOR_DELIVERY_PACKAGE_PANEL_ID,
  INSPECTOR_HANDOVER_QUICK_ACTIONS,
  INSPECTOR_JOB_DETAIL_LAYOUT_ORDER,
  inspectorDeliveryPackageStatusDisplay,
  inspectorHandoverQuickActionsForRender,
  inspectorJobDetailContentOrder,
} from "../src/lib/inspector-handover-ux.ts";
import { applyDeliveryPackagePublication } from "../src/lib/delivery-package-publications/publication.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";

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

const JOB_ID = "job-ux002";
const JOB = {
  id: JOB_ID,
  address: "ul. UX 2",
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

console.log("=== UX002-T01 status render — brak pakietu ===");
{
  const status = inspectorDeliveryPackageStatusDisplay([], JOB_ID);
  assert(status.ready === false, "not ready");
  assert(status.badgeClass.includes("border-red"), "danger badge class");
  assert(status.label === "BRAK PAKIETU", "BRAK label");
  assert(!("emoji" in status), "no emoji field");
}

console.log("=== UX002-T02 status render — pakiet gotowy ===");
{
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
  const status = inspectorDeliveryPackageStatusDisplay(pubs, JOB_ID);
  assert(status.ready === true, "ready");
  assert(status.badgeClass.includes("border-emerald"), "success badge class");
  assert(status.label === "PAKIET GOTOWY", "GOTOWY label");
}

console.log("=== UX002-T03 quick actions render ===");
{
  const actions = inspectorHandoverQuickActionsForRender();
  assert(actions.length === 3, "three actions");
  assert(actions[0].id === "download_package" && actions[0].label === "Pobierz pakiet", "download first");
  assert(actions[1].id === "checklist" && actions[1].targetSection === "docs", "checklist → docs");
  assert(actions[2].id === "photos" && actions[2].targetSection === "photos", "photos → photos");
  assert(
    INSPECTOR_HANDOVER_QUICK_ACTIONS.every((a) => a.label.length > 0),
    "all labels non-empty",
  );
}

console.log("=== UX002-T04 pakiet visible priority ===");
{
  assert(
    INSPECTOR_JOB_DETAIL_LAYOUT_ORDER.indexOf("delivery_package")
      < INSPECTOR_JOB_DETAIL_LAYOUT_ORDER.indexOf("section_content"),
    "layout: pakiet before section content",
  );
  const order = inspectorJobDetailContentOrder("wm");
  assert(order[0] === INSPECTOR_DELIVERY_PACKAGE_PANEL_ID, "scroll order: pakiet first");
  assert(order[1] === "section:wm", "scroll order: section second");
  assert(INSPECTOR_DELIVERY_PACKAGE_PANEL_ID === "inspector-delivery-package", "stable panel id");
}

console.log("");
console.log(`UX002 RESULT: ${passed} PASS / ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
